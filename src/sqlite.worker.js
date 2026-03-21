/**
 * sqlite.worker.js
 * Runs entirely off the UI thread. Manages OPFS database via @sqlite.org/sqlite-wasm.
 * Message protocol: { type, id, sql?, params?, name? }
 * Response protocol: { id, result?, error? }
 */

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

let db = null;

const SCHEMA = `
  PRAGMA journal_mode=WAL;
  PRAGMA foreign_keys=ON;

  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT    UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT   NOT NULL,
    first_name   TEXT    NOT NULL,
    middle_name  TEXT    DEFAULT '',
    last_name    TEXT    NOT NULL,
    created_at   TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    name       TEXT    NOT NULL,
    type       TEXT    NOT NULL CHECK(type IN ('cash','bank','ewallet','investment','savings')),
    balance    REAL    NOT NULL DEFAULT 0,
    color      TEXT    NOT NULL DEFAULT '#6C63FF',
    created_at TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS categories (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name    TEXT    NOT NULL,
    type    TEXT    NOT NULL CHECK(type IN ('income','expense')),
    icon    TEXT    NOT NULL DEFAULT '📦',
    color   TEXT    NOT NULL DEFAULT '#6C63FF',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    account_id  INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    amount      REAL    NOT NULL CHECK(amount > 0),
    type        TEXT    NOT NULL CHECK(type IN ('income','expense')),
    note        TEXT    DEFAULT '',
    date        TEXT    NOT NULL,
    created_at  TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
    FOREIGN KEY (account_id)  REFERENCES accounts(id)  ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_tx_user    ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_tx_date    ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);
`;

/** Seed default categories for a new user */
function seedCategories(userId) {
  const defaults = [
    ['Salary',      'income',  '💼', '#00D4AA'],
    ['Freelance',   'income',  '💻', '#00B4D8'],
    ['Investment',  'income',  '📈', '#4CC9F0'],
    ['Food',        'expense', '🍔', '#FF6B8A'],
    ['Transport',   'expense', '🚗', '#FF9F43'],
    ['Housing',     'expense', '🏠', '#A29BFE'],
    ['Healthcare',  'expense', '⚕️',  '#FD79A8'],
    ['Shopping',    'expense', '🛍️',  '#FDCB6E'],
    ['Utilities',   'expense', '⚡',  '#55EFC4'],
    ['Education',   'expense', '📚', '#74B9FF'],
    ['Entertainment','expense','🎮', '#E17055'],
    ['Other',       'expense', '📦', '#636E72'],
  ];
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO categories(user_id,name,type,icon,color) VALUES(?,?,?,?,?)'
  );
  try {
    defaults.forEach(([name, type, icon, color]) =>
      stmt.bind([userId, name, type, icon, color]).stepReset()
    );
  } finally {
    stmt.finalize();
  }
}

/** Run schema migrations */
function initSchema() {
  db.exec(SCHEMA);

  // Use user_version for robust migrations
  const [{ user_version: version }] = query('PRAGMA user_version');
  
  if (version < 1) {
    console.log('[FinTrak DB] Migrating schema to v1 (Savings & Investment support)...');
    try {
      db.exec(`
        PRAGMA foreign_keys=OFF;
        BEGIN TRANSACTION;
        DROP TABLE IF EXISTS accounts_old;
        ALTER TABLE accounts RENAME TO accounts_old;
        CREATE TABLE accounts (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id    INTEGER NOT NULL,
          name       TEXT    NOT NULL,
          type       TEXT    NOT NULL CHECK(type IN ('cash','bank','ewallet','investment','savings')),
          balance    REAL    NOT NULL DEFAULT 0,
          color      TEXT    NOT NULL DEFAULT '#6C63FF',
          created_at TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        INSERT INTO accounts (id, user_id, name, type, balance, color, created_at)
        SELECT id, user_id, name, type, balance, color, created_at FROM accounts_old;
        DROP TABLE accounts_old;
        PRAGMA user_version = 1;
        COMMIT;
        PRAGMA foreign_keys=ON;
      `);
      console.log('[FinTrak DB] Migration to v1 successful.');
    } catch (err) {
      console.error('[FinTrak DB] Migration v1 failed:', err);
      try { db.exec('ROLLBACK;'); } catch(e) {}
      // If accounts_old exists but accounts is gone, try to restore
      try { db.exec('ALTER TABLE accounts_old RENAME TO accounts;'); } catch(e) {}
    }
  }
}

/** Sanitize results for JSON serialization (converts BigInt to Number) */
function sanitize(val) {
  if (typeof val === 'bigint') return Number(val);
  if (Array.isArray(val)) return val.map(sanitize);
  if (val !== null && typeof val === 'object') {
    const obj = {};
    for (const k in val) obj[k] = sanitize(val[k]);
    return obj;
  }
  return val;
}

/** Execute a query returning rows as objects */
function query(sql, params = []) {
  const rows = [];
  db.exec({
    sql,
    bind: params,
    rowMode: 'object',
    callback: (row) => rows.push(row),
  });
  return sanitize(rows);
}

/** Execute a statement returning { changes, lastInsertRowid } */
function run(sql, params = []) {
  db.exec({ sql, bind: params });
  return sanitize({
    changes: db.changes(),
    lastInsertRowid: db.lastInsertRowid,
  });
}

// ─── Message handler ──────────────────────────────────────────────────────────

self.onmessage = async ({ data }) => {
  const { type, id, sql, params, userId } = data;

  try {
    let result;

    switch (type) {
      case 'init': {
        const sqlite3 = await sqlite3InitModule({ print: () => {}, printErr: () => {} });

        if (sqlite3.capi.sqlite3_vfs_find('opfs')) {
          db = new sqlite3.oo1.OpfsDb('/fintrak.db', 'c');
        } else {
          // Fallback: in-memory (no OPFS support)
          db = new sqlite3.oo1.DB(':memory:', 'c');
          console.warn('[FinTrak DB] OPFS unavailable, using in-memory fallback.');
        }

        initSchema();
        result = { ready: true, vfs: db.filename };
        break;
      }

      case 'query':
        result = query(sql, params);
        break;

      case 'run': {
        const r = run(sql, params);
        result = r;
        break;
      }

      case 'seed_categories':
        seedCategories(userId);
        result = { ok: true };
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, error: err.message ?? String(err) });
  }
};

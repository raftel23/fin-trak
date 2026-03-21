/**
 * db.js
 * Promise-based wrapper around the SQLite Web Worker.
 * All DB operations happen off the UI thread via postMessage.
 */

let worker = null;
let pending = new Map();
let msgId = 0;

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./sqlite.worker.js', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = ({ data }) => {
      const { id, result, error } = data;
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      error ? p.reject(new Error(error)) : p.resolve(result);
    };
    worker.onerror = (e) => {
      console.error('[FinTrak DB Worker Error]', e);
    };
  }
  return worker;
}

function send(payload) {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ ...payload, id });
  });
}

/** Initialize the database (call once on app start) */
export function initDB() {
  return send({ type: 'init' });
}

/**
 * Run a SELECT query — returns an array of row objects.
 * @param {string} sql
 * @param {Array} params
 */
export function dbQuery(sql, params = []) {
  return send({ type: 'query', sql, params });
}

/**
 * Run an INSERT / UPDATE / DELETE — returns { changes, lastInsertRowid }.
 * @param {string} sql
 * @param {Array} params
 */
export function dbRun(sql, params = []) {
  return send({ type: 'run', sql, params });
}

/** Seed default categories for a newly registered user */
export function seedCategories(userId) {
  return send({ type: 'seed_categories', userId });
}

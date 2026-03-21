/**
 * auth.js
 * SubtleCrypto-based password hashing and user auth helpers.
 * All hashing is done client-side using the Web Crypto API (SHA-256 + random salt).
 * Format stored: "<hex_salt>:<hex_hash>"
 */

import { dbQuery, dbRun, seedCategories } from './db.js';

// ─── Crypto helpers ───────────────────────────────────────────────────────────

function bufToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

/**
 * Hash a plain-text password with a random 16-byte salt via SHA-256.
 * @returns {Promise<string>} "salt_hex:hash_hex"
 */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return `${bufToHex(salt.buffer)}:${bufToHex(derived)}`;
}

/**
 * Verify a plain-text password against a stored "salt:hash" string.
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, stored) {
  const [saltHex, _] = stored.split(':');
  const salt = new Uint8Array(hexToBuf(saltHex));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const candidate = `${saltHex}:${bufToHex(derived)}`;
  return candidate === stored;
}

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Register a new user. Throws if username already exists.
 * @param {{ username, password, firstName, middleName, lastName }} data
 */
export async function registerUser({ username, password, firstName, middleName, lastName }) {
  const existing = await dbQuery(
    'SELECT id FROM users WHERE username = ? LIMIT 1',
    [username.trim().toLowerCase()]
  );
  if (existing.length > 0) throw new Error('Username already taken.');

  const hash = await hashPassword(password);
  const result = await dbRun(
    `INSERT INTO users(username, password_hash, first_name, middle_name, last_name)
     VALUES(?, ?, ?, ?, ?)`,
    [username.trim().toLowerCase(), hash, firstName.trim(), middleName.trim(), lastName.trim()]
  );

  // Seed default categories for the new user
  await seedCategories(result.lastInsertRowid);

  return { id: result.lastInsertRowid, username: username.trim().toLowerCase() };
}

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Verify credentials and return the user row on success.
 * @returns {Promise<object|null>}
 */
export async function loginUser({ username, password }) {
  const rows = await dbQuery(
    `SELECT id, username, password_hash, first_name, middle_name, last_name
     FROM users WHERE username = ? LIMIT 1`,
    [username.trim().toLowerCase()]
  );
  if (rows.length === 0) return null;

  const user = rows[0];
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return null;

  const { password_hash, ...safe } = user;
  return { ...safe, password }; // Include password for key derivation during export
}

// ─── Data Sync Encryption ─────────────────────────────────────────────────────

/**
 * Encrypt arbitrary JSON data with a password using AES-GCM.
 * Used for multi-device sync (Export).
 * @returns {Promise<Blob>}
 */
export async function encryptData(data, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive key from password
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(data))
  );

  // Bundle: [SALT(16)][IV(12)][CIPHERTEXT]
  const bundle = new Uint8Array(salt.byteLength + iv.byteLength + ciphertext.byteLength);
  bundle.set(salt, 0);
  bundle.set(iv, salt.byteLength);
  bundle.set(new Uint8Array(ciphertext), salt.byteLength + iv.byteLength);

  return new Blob([bundle], { type: 'application/octet-stream' });
}

/**
 * Decrypt a .fintrak blob with a password.
 * Used for multi-device sync (Import).
 */
export async function decryptData(blob, password) {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const buffer = await blob.arrayBuffer();
  const bundle = new Uint8Array(buffer);

  const salt = bundle.slice(0, 16);
  const iv = bundle.slice(16, 28);
  const ciphertext = bundle.slice(28);

  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return JSON.parse(dec.decode(decrypted));
  } catch (err) {
    throw new Error('Invalid password or corrupted backup file.');
  }
}

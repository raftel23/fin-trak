# [FIX] Persistent SQLite 'accounts_old' Error

This plan resolves the `no such table: accounts_old` error that occurs when deleting categories or transactions. 

## The Problem
Previous migrations used `ALTER TABLE accounts RENAME TO accounts_old`. In SQLite, when a table is renamed, other tables' Foreign Keys (like `transactions.account_id`) are updated to point to the new name. When `accounts_old` was later dropped, these Foreign Keys became "dangling," pointing to a non-existent table. This causes SQLite to throw errors during any operation (like DELETE) that triggers a foreign key check.

## Proposed Changes

### [Component] SQLite Worker
Refactor the migration logic in [sqlite.worker.js](file:///c:/Users/Ashford/Desktop/fin-trak/src/sqlite.worker.js) to perform a "Deep Clean" for all users on `user_version < 2`.

#### [MODIFY] [sqlite.worker.js](file:///c:/Users/Ashford/Desktop/fin-trak/src/sqlite.worker.js)
- Implement **Migration v2**:
  - Disable Foreign Keys (`PRAGMA foreign_keys=OFF`).
  - Rename `accounts` and `transactions` to temporary backup tables.
  - Re-run the full `SCHEMA` to create fresh tables with clean metadata.
  - Restore data from backups using `INSERT INTO ... SELECT * FROM ...`.
  - Drop backup tables.
  - Set `PRAGMA user_version = 2`.
  - Re-enable Foreign Keys.

## Verification Plan

### Automated Tests
- The migration will run automatically on the next app load.
- Check browser console for `[FinTrak DB] Migration to v2 successful`.

### Manual Verification
- **Category Deletion**: Confirm that categories can be deleted without the `accounts_old` error.
- **Account Creation**: Verify that the new `savings` and `investment` types are still functional.
- **Data Persistence**: Ensure all existing transactions and accounts remain intact after the deep clean.

# [NEW] Encrypted Backup & Sync

This feature allows users to securely move their data between devices without a central server by using encrypted file exports.

## Technical Design
- **Encryption**: AES-GCM (256-bit) using a key derived from the user's password (PBKDF2).
- **Data Bundle**: A JSON object containing all tables (`users`, `accounts`, `categories`, `transactions`).
- **File Format**: `.fintrak` (Binary/Blob).

## Proposed Changes

### [Component] Authentication Logic (auth.js)
- Add `encryptData(data, password)` and `decryptData(blob, password)` helpers using `SubtleCrypto`.

### [Component] Database Layer (db.js / worker)
- Add an `exportDatabase()` function that queries all records and returns a unified JSON object.
- Add an `importDatabase(data)` function that wipes the current DB and restores records sequentially.

### [Component] Login UI (LoginPage.jsx)
- Add a "Sync / Restore from Backup" link below the login form.
- Implement a simple file-upload and password-entry flow.

### [Component] Dashboard UI (DashboardPage.jsx)
- Add a "Create Encrypted Backup" button to allow users to export their data.

## Verification Plan

### Automated Tests
- Test encryption/decryption cycle with a mock database object.
- Verify file download/upload events in the browser.

### Manual Verification
- **Device 1**: Create accounts and transactions, then export a `.fintrak` file.
- **Device 2**: Open the app, go to Login, select "Restore from Backup," and import the file.
- **Verification**: Check that all balances, categories, and icons match exactly.

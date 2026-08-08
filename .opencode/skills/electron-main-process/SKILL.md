---
name: electron-main-process
description: Governs code generation and architecture within the Electron Main Process (src/main/), covering database standards, safeStorage keychain security, and the DeepSeek API client.
---

# SKILL: Electron Main Process & Native Engineering

This skill governs code generation and architecture within the Electron Main Process (`src/main/`).

## 1. Core Principles & Boundaries

- **Backend Mindset:** Treat the Main Process as a local backend server. It handles file I/O, database persistence, OS keychain encryption, and external API requests.
- **Never Import UI Dependencies:** Do NOT import React, DOM helpers, or frontend libraries in `src/main/`.

## 2. Database Standards (better-sqlite3)

- **Prepared Statements Only:** Never execute raw concatenated SQL strings. Always use prepared statements with parameterized inputs to prevent SQL injection and ensure performance:

  ```ts
  // CORRECT
  const stmt = db.prepare('SELECT * FROM tasks WHERE status = ?');
  const tasks = stmt.all(status);
  ```

- **WAL Mode & Transactions:** Ensure WAL mode is active (`PRAGMA journal_mode = WAL;`). Wrap multi-statement mutations in explicit transactions (`db.transaction()`).
- **Unix Timestamping:** Store timestamps as integer milliseconds (`Date.now()`). Store durations in integer minutes.

## 3. Security & Keychain (safeStorage)

- **Key Encryption:** Always use `safeStorage.encryptString()` and `safeStorage.decryptString()` when reading or writing user API keys.
- **Fallback Failure:** If `safeStorage.isEncryptionAvailable()` returns `false`, throw a loud, clear error. Never fall back to plaintext file storage.
- **Log Sanitization:** Strip API keys, tokens, and markdown task content from log output.

## 4. DeepSeek API Client Guidelines

- **Centralized Service:** All DeepSeek API HTTP requests must pass through `src/main/services/deepseekService.ts`.
- **Resilience:** Include a mandatory 30-second timeout and retry logic (max 3 retries with exponential backoff) for API calls.
- **Validation:** Validate DeepSeek JSON responses against expected schemas before returning them across the IPC bridge.

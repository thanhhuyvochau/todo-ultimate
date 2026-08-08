# safeStorage Keychain

## Overview
Encrypt the user's DeepSeek API key using Electron's native `safeStorage` API. The key is stored encrypted on disk and decrypted only in memory within the Main Process when making API calls. The key is never exposed to the Renderer or stored as plaintext.

## Requirements
- Use `safeStorage.encryptString()` to encrypt before writing.
- Use `safeStorage.decryptString()` to decrypt in memory for API calls.
- Store encrypted key in a file within the app's user data directory (`app.getPath('userData')`).
- Check `safeStorage.isEncryptionAvailable()` on startup; throw loudly if unavailable.
- Never fall back to plaintext storage.
- Never log the key or expose it over IPC in raw form.

## API Surface (Main Process)
```ts
// src/main/services/keychainService.ts
export function setApiKey(key: string): void;      // encrypt + write to file
export function getApiKey(): string | null;          // read + decrypt
export function deleteApiKey(): void;                // remove key file
export function isApiKeySet(): boolean;              // check if key file exists
export function isEncryptionAvailable(): boolean;    // safeStorage check
```

## File Structure
```
{userData}/
  .envrypted-key     # encrypted API key bytes
```

## Error Handling
- `safeStorage.isEncryptionAvailable() === false` → throw `KEYCHAIN_UNAVAILABLE` error.
- Corrupted key file → return null, log warning (no secret data).
- File write failure → throw `KEYCHAIN_WRITE_FAILED`.

## Log Sanitization
- Strip API keys, bearer tokens, and any auth headers from all log output.
- Redact markdown note content from logs (may contain secrets).
- Log only: "API key saved successfully" / "API key deleted" / "Encryption unavailable".

## Dependencies
- None (standalone, used by Feature 14 DeepSeek API Client)

## Acceptance Criteria
- [ ] `safeStorage.isEncryptionAvailable()` checked on startup.
- [ ] Key encrypted before file write via `safeStorage.encryptString()`.
- [ ] Key decrypted only in memory via `safeStorage.decryptString()`.
- [ ] No plaintext key on disk, in logs, or in IPC traffic.
- [ ] Clear error thrown if encryption unavailable.
- [ ] Delete removes the key file completely.

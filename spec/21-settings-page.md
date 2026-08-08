# Settings Page

## Overview
Centralized settings panel for API key management, default preferences (focus hours, theme), and recurring rule management. Accessible from the sidebar under "Settings".

## Sections

### 1. API Key Management
- Input field: masked password-style input for DeepSeek API key.
- Status indicator: "Key saved" (green) or "No key set" (gray) or "Invalid" (red).
- Save button: encrypts via safeStorage and persists.
- Test Connection button: sends a minimal API call to validate the key.
- Delete button: removes key with confirmation.
- Link to DeepSeek API key page (opens in external browser).

### 2. Default Preferences
- **Default focus hours**: number input (0.5–24, step 0.5). Default: 6.
- **Theme**: radio buttons for Light / Dark / System.
- **Default timeframe for reports**: dropdown (7 / 14 / 30 days).

### 3. Recurring Rules Management
- List of all recurring rules (from Feature 8).
- Toggle per rule to enable/disable.
- Add new rule button → opens rule creation form.
- Edit/delete actions per rule.
- Empty state: "No recurring rules yet."

### 4. Data Management
- **Export all data**: download tasks + time logs as JSON file.
- **Clear all data**: delete all tasks, logs, plans, and reports. Confirmation dialog with "type DELETE to confirm" pattern.
- App version display.

## UI Behavior
- Form saves auto-persist to appropriate stores.
- API key save triggers encryption in main process.
- Theme changes apply immediately (swap CSS classes).
- Test connection shows loading spinner then success/failure toast.

## IPC Channels Used
- `key:set`, `key:get`, `key:delete` — for API key.
- `tasks:getAll`, `tasks:create`, `tasks:update`, `tasks:delete` — for recurring rules.

## Edge Cases
- Test connection with no API key → prompt to save key first.
- Test connection failure → show specific error (invalid key vs network error).
- Clear all data → irreversible, strict confirmation required.

## Dependencies
- Feature 3 (safeStorage), Feature 8 (Recurring Rules), Feature 14 (DeepSeek Client)

## Acceptance Criteria
- [ ] API key saves and encrypts via safeStorage.
- [ ] Test connection validates the key.
- [ ] Delete key removes from keychain.
- [ ] Focus hours persist across sessions.
- [ ] Theme changes apply immediately.
- [ ] Recurring rules CRUD works from settings.
- [ ] Export downloads JSON file.
- [ ] Clear all data requires confirmation.

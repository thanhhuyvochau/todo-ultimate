# Error Handling & Reconnection

## Overview
Comprehensive error handling strategy across the entire application stack: IPC errors, API failures, database errors, validation failures, and network interruptions. Errors are surfaced to the user non-intrusively and never crash the application.

## Error Types

### IPC Errors (`IpcResult`)
```ts
type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
```

| Code | Source | User Message |
|------|--------|-------------|
| `DB_READ_FAILED` | Database | "Couldn't load data. Try restarting the app." |
| `DB_WRITE_FAILED` | Database | "Changes couldn't be saved. Please try again." |
| `VALIDATION_ERROR` | User Input | Field-specific validation messages. |
| `STATE_TRANSITION_ILLEGAL` | Status Workflow | "This action isn't allowed in the current state." |
| `NOT_FOUND` | Any | "The requested item was not found." |
| `TASK_ALREADY_ACTIVE` | Timer | "Another task is already in progress." |
| `AI_TIMEOUT` | API | "The AI took too long. Please try again." |
| `AI_RATE_LIMITED` | API | "Too many requests. Wait a moment and try again." |
| `AI_AUTH_FAILED` | API | "Invalid API key. Check your key in Settings." |
| `AI_PARSE_ERROR` | API | "Couldn't understand the AI response. Try again." |
| `AI_NETWORK_ERROR` | API | "Network error. Check your connection." |
| `KEYCHAIN_UNAVAILABLE` | Security | "Secure storage is unavailable on this system." |
| `KEYCHAIN_WRITE_FAILED` | Security | "Couldn't save your API key. Check disk space." |
| `UNKNOWN` | Any | "Something went wrong. Please try again." |

## UI Patterns

### Toast Notifications
- Auto-dismiss: 5 seconds for success/info, persistent for errors with retry action.
- Position: bottom-right corner.
- Types: success (green), error (red), warning (yellow), info (blue).

### Inline Errors
- Form validation: red border + error message below field.
- Empty state errors: centered message with illustration + "Retry" button.

### Persistent Errors
- API key not set → Settings page banner until key is configured.
- Database corruption → fullscreen error with "Export/Reset" options.
- No crash on uncaught errors → error boundary with "Reload app" button.

## Error Boundary (React)
```tsx
class AppErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log sanitized error (no secrets)
    console.error('Uncaught renderer error:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReload={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}
```

## Reconnection Behavior
- Network status tracked via `navigator.onLine` events.
- Debounce online/offline transitions (1 second) to prevent flickering.
- On reconnection: AI features re-enabled automatically, no data sync needed.
- In-flight API calls that fail due to network → show retry button.

## Logging
- All errors logged on the main process side.
- Logs include: error code, timestamp, sanitized stack trace.
- Never log: API keys, bearer tokens, task note content, user data.
- Log level: `error` for failures, `warn` for recoverable issues, `info` for normal operations.

## Dependencies
- Feature 2 (IPC Bridge), Feature 14 (DeepSeek Client)

## Acceptance Criteria
- [ ] All IPC handlers return `IpcResult`, never throw across bridge.
- [ ] Toast notifications for errors and successes.
- [ ] Form validation errors displayed inline.
- [ ] React error boundary catches crashes.
- [ ] API failures show retry option.
- [ ] Network reconnection re-enables AI features.
- [ ] No secrets in logs.
- [ ] No app crashes from unhandled errors.

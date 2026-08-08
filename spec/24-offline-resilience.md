# Offline Resilience

## Overview
The app must remain fully functional for all core operations (task CRUD, time tracking, notes editing) without an internet connection. Only DeepSeek API features require connectivity, and their unavailability must degrade gracefully.

## Requirements
- Task CRUD, time tracking, markdown editing: fully offline, no network calls.
- Database: local SQLite, no remote sync, no cloud dependency.
- App startup: must not require network to initialize or load data.
- Offline detection: `navigator.onLine` + `online`/`offline` event listeners.
- AI features disabled with clear messaging when offline.
- Queued actions: none needed (no sync to remote).

## Offline Indicators

### AI Features (when offline)
- "Generate Daily Plan" button → disabled with tooltip "Requires internet connection."
- "Generate Report" button → disabled with tooltip "Requires internet connection."
- Previous cached plans and reports remain accessible.
- API key test → returns offline status.

### Status Bar
- Online: no indicator (normal state).
- Offline: ⚠️ "Offline — AI features unavailable."

## Network Detection
```ts
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

## Graceful Degradation
- AI buttons: visually dimmed + tooltip, not hidden.
- Plan/Report views: show cached data if available, empty state if none.
- Settings: API key management works (local encryption), test connection disabled.
- No data loss: all local operations continue unaffected.

## Edge Cases
- Intermittent connection (flaky wifi) → don't toggle UI rapidly. Debounce online/offline transitions (1s delay).
- API call in-flight when connection drops → show timeout error, don't crash.
- Reconnection after long offline → no sync needed, just re-enable AI buttons.

## Dependencies
- Feature 14 (DeepSeek Client), Feature 15 (Planning), Feature 17 (Reports)

## Acceptance Criteria
- [ ] All core features work without network.
- [ ] AI features disabled with clear messaging when offline.
- [ ] Offline status visible in footer.
- [ ] No errors on startup without network.
- [ ] Cached plans/reports accessible offline.
- [ ] Reconnection re-enables AI features.
- [ ] No rapid UI toggles on flaky connections.

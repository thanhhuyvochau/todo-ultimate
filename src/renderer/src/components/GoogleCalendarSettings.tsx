import { useEffect } from "react";
import {
  CalendarDays,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useGoogleCalendarStore } from "../stores/googleCalendarStore";
import { useToastStore } from "../stores/toastStore";

export function GoogleCalendarSettings() {
  const {
    settings,
    isLoading,
    isSaving,
    error,
    load,
    update,
    connect,
    sync,
    clearError,
  } = useGoogleCalendarStore();
  const addToast = useToastStore((state) => state.addToast);
  useEffect(() => {
    void load();
  }, [load]);

  const startConnection = async () => {
    if (await connect()) {
      addToast(
        "success",
        "Complete Google authorization in your browser, then return here.",
      );
    }
  };

  const toggleCalendar = async (id: string, selected: boolean) => {
    if (!settings) return;
    const selectedCalendarIds = selected
      ? [...settings.selectedCalendarIds, id]
      : settings.selectedCalendarIds.filter((calendarId) => calendarId !== id);
    if (await update({ selectedCalendarIds })) await sync();
  };

  if (!settings?.isAvailable) return null;

  return (
    <section className="rounded-lg border border-border bg-bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <CalendarDays className="mt-0.5 h-5 w-5 text-accent" />
          <div>
            <h2 className="font-semibold text-text-primary">Google Calendar</h2>
            <p className="mt-1 text-sm text-text-muted">
              Import busy meetings as read-only fixed blocks for daily planning.
            </p>
          </div>
        </div>
        {settings?.isConnected && (
          <span className="rounded-full bg-success-subtle px-2.5 py-1 text-xs font-medium text-success">
            Connected
          </span>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
          <span>{error}</span>
          <button onClick={clearError} className="underline">
            Dismiss
          </button>
        </div>
      )}
      {settings?.syncError && !error && (
        <p className="mt-4 rounded-md bg-warning-subtle px-3 py-2 text-sm text-warning">
          {settings.syncError}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => void startConnection()}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          {settings?.isConnected ? "Reconnect" : "Connect Google Calendar"}
        </button>
        {settings?.isConnected && (
          <button
            onClick={() => void sync()}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-text-secondary hover:bg-bg-tertiary disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" /> Sync now
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm text-text-muted">
          Loading calendar settings…
        </p>
      ) : (
        settings?.isConnected && (
          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-text-primary">
                Calendars to sync
              </h3>
              {settings.lastSyncedAt && (
                <span className="text-xs text-text-muted">
                  Synced {new Date(settings.lastSyncedAt).toLocaleString()}
                </span>
              )}
            </div>
            {settings.calendars.length === 0 ? (
              <p className="mt-2 text-sm text-text-muted">
                Finish authorization, then refresh this page to choose
                calendars.
              </p>
            ) : (
              <div className="mt-2 divide-y divide-border">
                {settings.calendars.map((calendar) => (
                  <label
                    key={calendar.id}
                    className="flex cursor-pointer items-center gap-3 py-2.5 text-sm text-text-primary"
                  >
                    <input
                      type="checkbox"
                      checked={settings.selectedCalendarIds.includes(
                        calendar.id,
                      )}
                      onChange={(event) =>
                        void toggleCalendar(calendar.id, event.target.checked)
                      }
                      className="h-4 w-4 accent-accent"
                    />
                    <span className="flex-1">{calendar.summary}</span>
                    {calendar.primary && (
                      <Check
                        className="h-4 w-4 text-accent"
                        aria-label="Primary calendar"
                      />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        )
      )}
    </section>
  );
}

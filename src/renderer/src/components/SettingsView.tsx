import { RecurringRulesPanel } from "./RecurringRulesPanel";

export function SettingsView() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">
          Configure your recurring tasks, API keys, and preferences.
        </p>
      </div>

      <section className="space-y-6">
        <RecurringRulesPanel />
      </section>
    </div>
  );
}

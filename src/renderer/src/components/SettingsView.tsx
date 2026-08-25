import { RecurringRulesPanel } from "./RecurringRulesPanel";
import { ApiKeySettings } from "./ApiKeySettings";

export function SettingsView() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-5">
        <span className="text-lg font-semibold text-text-primary">
          Settings
        </span>
      </div>
      <div className="space-y-8 p-6">
        <ApiKeySettings />
        <RecurringRulesPanel />
      </div>
    </div>
  );
}

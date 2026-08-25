import type { LucideIcon } from "lucide-react";
import { Inbox, Calendar, Lightbulb, BarChart2, Settings } from "lucide-react";

export type ViewName = "backlog" | "today" | "plan" | "reports" | "settings";

interface NavItem {
  id: ViewName;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "backlog", label: "Backlog", icon: Inbox, enabled: true },
  { id: "today", label: "Today", icon: Calendar, enabled: true },
  { id: "plan", label: "Daily Plan", icon: Lightbulb, enabled: true },
  { id: "reports", label: "Reports", icon: BarChart2, enabled: true },
  { id: "settings", label: "Settings", icon: Settings, enabled: true },
];

interface SidebarProps {
  activeView: ViewName;
  onNavigate: (view: ViewName) => void;
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border py-3">
      <nav className="flex flex-1 flex-col gap-1 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => item.enabled && onNavigate(item.id)}
              disabled={!item.enabled}
              aria-label={item.label}
              className={[
                "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-100",
                isActive
                  ? "bg-accent-subtle text-accent"
                  : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary",
                !item.enabled
                  ? "cursor-not-allowed opacity-30"
                  : "cursor-pointer",
              ].join(" ")}
            >
              <Icon
                className="h-5 w-5 shrink-0"
                strokeWidth={isActive ? 2 : 1.75}
              />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-accent" />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

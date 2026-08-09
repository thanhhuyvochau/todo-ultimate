import type { LucideIcon } from "lucide-react";
import { Inbox, Calendar, Lightbulb, BarChart3, Settings } from "lucide-react";

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
  { id: "plan", label: "Daily Plan", icon: Lightbulb, enabled: false },
  { id: "reports", label: "Reports", icon: BarChart3, enabled: false },
  { id: "settings", label: "Settings", icon: Settings, enabled: false },
];

interface SidebarProps {
  activeView: ViewName;
  onNavigate: (view: ViewName) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({
  activeView,
  onNavigate,
  collapsed,
  onToggle,
}: SidebarProps) {
  return (
    <aside
      className={`flex flex-col border-r border-border bg-bg-secondary transition-all duration-200 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      <div className="flex h-14 items-center border-b border-border px-3">
        <button
          onClick={onToggle}
          className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
          aria-label="Toggle sidebar"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => item.enabled && onNavigate(item.id)}
              disabled={!item.enabled}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent-subtle text-accent"
                  : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
              } ${!item.enabled ? "cursor-not-allowed opacity-40" : ""}`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

import { useState, useEffect } from "react";
import type { ViewName } from "./Sidebar";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BacklogView } from "./BacklogView";
import { TodayView } from "./TodayView";
import { StatusFooter } from "./StatusFooter";

const ENABLED_VIEWS: ViewName[] = ["backlog", "today"];

export function AppShell() {
  const [activeView, setActiveView] = useState<ViewName>("backlog");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      const index = Number(e.key) - 1;
      if (index >= 0 && index < ENABLED_VIEWS.length) {
        e.preventDefault();
        setActiveView(ENABLED_VIEWS[index]!);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col bg-bg-primary text-text-primary">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeView={activeView}
          onNavigate={setActiveView}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-hidden">
          {activeView === "backlog" && <BacklogView />}
          {activeView === "today" && <TodayView />}
          {activeView === "plan" && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-text-muted">
                Daily Plan — coming soon
              </p>
            </div>
          )}
          {activeView === "reports" && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-text-muted">Reports — coming soon</p>
            </div>
          )}
          {activeView === "settings" && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-text-muted">Settings — coming soon</p>
            </div>
          )}
        </main>
      </div>
      <StatusFooter />
    </div>
  );
}

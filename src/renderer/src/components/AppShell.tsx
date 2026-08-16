import { useState, useEffect } from "react";
import type { ViewName } from "./Sidebar";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BacklogView } from "./BacklogView";
import { TodayView } from "./TodayView";
import { PlanView } from "./PlanView";
import { SettingsView } from "./SettingsView";
import { StatusFooter } from "./StatusFooter";
import { useTimerStore } from "../stores/timerStore";

const ENABLED_VIEWS: ViewName[] = ["backlog", "today", "plan"];

export function AppShell() {
  const [activeView, setActiveView] = useState<ViewName>("backlog");

  useEffect(() => {
    useTimerStore.getState().initTimer();
  }, []);

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
      <div className="flex flex-1 overflow-hidden border-t border-border">
        <Sidebar activeView={activeView} onNavigate={setActiveView} />
        <main className="flex-1 overflow-hidden">
          {activeView === "backlog" && <BacklogView />}
          {activeView === "today" && <TodayView />}
          {activeView === "plan" && (
            <PlanView onApproved={() => setActiveView("today")} />
          )}
          {activeView === "reports" && (
            <PlaceholderView
              label="Reports"
              sublabel="Performance insights coming soon"
            />
          )}
          {activeView === "settings" && <SettingsView />}
        </main>
      </div>
      <StatusFooter />
    </div>
  );
}

function PlaceholderView({
  label,
  sublabel,
}: {
  label: string;
  sublabel: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1">
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      <p className="text-xs text-text-muted">{sublabel}</p>
    </div>
  );
}

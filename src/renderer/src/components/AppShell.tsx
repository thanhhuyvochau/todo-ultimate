import { useState, useEffect } from "react";
import type { ViewName } from "./Sidebar";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BacklogView } from "./BacklogView";
import { TodayView } from "./TodayView";
import { PlanView } from "./PlanView";
import { SettingsView } from "./SettingsView";
import { ReportsView } from "./ReportsView";
import { StatusFooter } from "./StatusFooter";
import { ToastContainer } from "./ToastContainer";
import { useTimerStore } from "../stores/timerStore";
import { useNetworkStore } from "../stores/networkStore";

const ENABLED_VIEWS: ViewName[] = ["backlog", "today", "plan", "reports"];

export function AppShell() {
  const [activeView, setActiveView] = useState<ViewName>("backlog");

  useEffect(() => {
    useTimerStore.getState().initTimer();
    useNetworkStore.getState().initNetwork();
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
          {activeView === "reports" && <ReportsView />}
          {activeView === "settings" && <SettingsView />}
        </main>
      </div>
      <StatusFooter />
      <ToastContainer />
    </div>
  );
}

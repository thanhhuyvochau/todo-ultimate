import { useState } from "react";
import { BarChart2, Trash2 } from "lucide-react";
import type { PerformanceReportSummary } from "@/shared/models";
import { useReportStore } from "../stores/reportStore";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeframe(item: PerformanceReportSummary): string {
  return `${formatDate(item.timeframeStart)} – ${formatDate(item.timeframeEnd)}`;
}

export function ReportHistory() {
  const reports = useReportStore((s) => s.reports);
  const viewReport = useReportStore((s) => s.viewReport);
  const deleteReport = useReportStore((s) => s.deleteReport);

  const [pendingDelete, setPendingDelete] =
    useState<PerformanceReportSummary | null>(null);

  if (reports.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-bg-surface p-6 text-center">
        <BarChart2 className="mx-auto h-7 w-7 text-text-muted" />
        <p className="mt-2 text-base font-medium text-text-primary">
          No reports yet
        </p>
        <p className="mt-1 text-sm text-text-muted">
          Generate your first performance report to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reports.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-surface p-4"
        >
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-text-primary">
              {formatTimeframe(item)}
            </p>
            <p className="mt-0.5 text-sm text-text-muted">
              Score {Math.round(item.efficiencyScore)}/100 ·{" "}
              {item.totalCompleted} task{item.totalCompleted === 1 ? "" : "s"} ·{" "}
              {formatDate(item.createdAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => void viewReport(item.id)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            >
              View
            </button>
            <button
              onClick={() => setPendingDelete(item)}
              aria-label="Delete report"
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-tertiary hover:text-danger"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      <DeleteConfirmationDialog
        isOpen={pendingDelete !== null}
        taskTitle={pendingDelete ? formatTimeframe(pendingDelete) : ""}
        itemType="report"
        onConfirm={() => {
          if (pendingDelete) {
            void deleteReport(pendingDelete.id);
          }
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

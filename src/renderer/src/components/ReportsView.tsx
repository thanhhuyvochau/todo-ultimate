import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart2,
  Check,
  CheckCircle2,
  Copy,
  Info,
  Loader2,
  Sparkles,
} from "lucide-react";
import type {
  PerformanceReportContent,
  ReportAdvice,
  ReportPattern,
  TaskPriority,
} from "@/shared/models";
import {
  resolveReportTimeframe,
  useReportStore,
  type ReportTimeframePreset,
} from "../stores/reportStore";
import { useNetworkStore } from "../stores/networkStore";
import { ReportHistory } from "./ReportHistory";

const PRESETS: { id: ReportTimeframePreset; label: string }[] = [
  { id: "7", label: "7 days" },
  { id: "14", label: "14 days" },
  { id: "30", label: "30 days" },
  { id: "custom", label: "Custom" },
];

const PRIORITIES: TaskPriority[] = ["high", "medium", "low"];

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function signedMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded === 0) return "0m";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)}m`;
}

function formatReportText(report: PerformanceReportContent): string {
  const lines: string[] = [
    "Performance Report",
    `Timeframe: ${formatDate(report.timeframe.start)} – ${formatDate(report.timeframe.end)}`,
    `Generated: ${formatDate(report.generatedAt)}`,
    "",
    `Efficiency score: ${report.metrics.efficiencyScore}/100 (${report.metrics.trendDirection})`,
    `Total completed: ${report.metrics.totalCompleted}`,
    `Mean variance: ${signedMinutes(report.metrics.overallVariance)}`,
    `Mean absolute variance: ${Math.round(report.metrics.meanAbsoluteVariance)}m`,
    "",
    report.summary,
    "",
    "Patterns:",
    ...report.patterns.map(
      (p) => `- [${p.severity}] ${p.title}: ${p.description}`,
    ),
    "",
    "Advice:",
    ...report.advice.map(
      (a) => `- [${a.category}] ${a.recommendation} (${a.actionableTip})`,
    ),
  ];
  return lines.join("\n");
}

const SEVERITY_STYLES: Record<
  ReportPattern["severity"],
  { icon: typeof Info; className: string }
> = {
  warning: { icon: AlertTriangle, className: "text-warning" },
  positive: { icon: CheckCircle2, className: "text-success" },
  info: { icon: Info, className: "text-text-secondary" },
};

function EfficiencyGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-bg-surface p-5">
      <span className="text-xs text-text-muted">Efficiency score</span>
      <span className="mt-1 text-3xl font-semibold text-text-primary">
        {clamped}
      </span>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-bg-tertiary">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <span className="text-xs text-text-muted">{label}</span>
      <p className="mt-1 text-lg font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function PriorityBreakdown({
  byPriority,
}: {
  byPriority: PerformanceReportContent["metrics"]["byPriority"];
}) {
  const maxAbs = Math.max(
    1,
    ...PRIORITIES.map((p) => Math.abs(byPriority[p].meanVariance)),
  );
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <span className="text-xs font-medium text-text-secondary">
        Mean variance by priority
      </span>
      <div className="mt-3 space-y-3">
        {PRIORITIES.map((priority) => {
          const bucket = byPriority[priority];
          const value = bucket.meanVariance;
          const width = (Math.abs(value) / maxAbs) * 100;
          const barClass =
            value > 0 ? "bg-danger" : value < 0 ? "bg-success" : "bg-border";
          return (
            <div key={priority}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">
                  {PRIORITY_LABELS[priority]}
                  <span className="ml-1 text-text-muted">({bucket.count})</span>
                </span>
                <span className="font-medium text-text-primary">
                  {signedMinutes(value)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-tertiary">
                <div
                  className={`h-full rounded-full ${barClass}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PatternsSection({ patterns }: { patterns: ReportPattern[] }) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <span className="text-xs font-medium text-text-secondary">Patterns</span>
      <ul className="mt-3 space-y-3">
        {patterns.map((pattern, i) => {
          const { icon: Icon, className } = SEVERITY_STYLES[pattern.severity];
          return (
            <li key={i} className="flex gap-2">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${className}`} />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {pattern.title}
                </p>
                <p className="text-xs text-text-secondary">
                  {pattern.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AdviceSection({ advice }: { advice: ReportAdvice[] }) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <span className="text-xs font-medium text-text-secondary">Advice</span>
      <ul className="mt-3 space-y-3">
        {advice.map((item, i) => (
          <li key={i} className="rounded-md bg-bg-tertiary p-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-bg-surface px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent">
                {item.category}
              </span>
              <p className="text-sm font-medium text-text-primary">
                {item.recommendation}
              </p>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              {item.actionableTip}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReportsView() {
  const {
    report,
    reports,
    viewingCachedId,
    preset,
    customStart,
    customEnd,
    isGenerating,
    error,
    setPreset,
    setCustomRange,
    generateReport,
    loadReports,
    clearError,
    clearReport,
  } = useReportStore();

  const isOnline = useNetworkStore((s) => s.isOnline);
  const [copied, setCopied] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const customDisabled =
    preset === "custom" &&
    (!customStart || !customEnd || customStart >= customEnd);

  const runGenerate = async () => {
    setShowReplaceConfirm(false);
    const ok = await generateReport();
    if (!ok) {
      setCopied(false);
    }
  };

  const handleGenerate = async () => {
    const { timeframeStart, timeframeEnd } = resolveReportTimeframe(
      preset,
      customStart,
      customEnd,
    );
    const existing = reports.some(
      (item) =>
        item.timeframeStart === timeframeStart &&
        item.timeframeEnd === timeframeEnd,
    );
    if (existing) {
      setShowReplaceConfirm(true);
      return;
    }
    await runGenerate();
  };

  const handleCopy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(formatReportText(report));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-bg-primary">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="text-sm font-semibold text-text-primary">Reports</span>
        {report && (
          <div className="flex items-center gap-3">
            {viewingCachedId && (
              <button
                onClick={clearReport}
                className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
            <button
              onClick={clearReport}
              className="text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              New report
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b border-danger/20 bg-danger-subtle px-4 py-2">
          <span className="flex-1 text-xs text-danger">{error}</span>
          <button
            onClick={clearError}
            className="text-xs text-danger underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {!report ? (
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <Sparkles className="mx-auto h-8 w-8 text-accent" />
              <h2 className="mt-3 text-lg font-medium text-text-primary">
                Generate a performance report
              </h2>
              <p className="mt-1 max-w-sm text-xs text-text-muted">
                The AI analyzes your completed tasks to coach you on estimation
                accuracy.
              </p>
            </div>

            <div className="w-full max-w-sm space-y-4">
              <div>
                <label className="mb-1 block text-xs text-text-secondary">
                  Timeframe
                </label>
                <div className="flex gap-1 rounded-md bg-bg-tertiary p-1">
                  {PRESETS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setPreset(item.id)}
                      className={[
                        "flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors",
                        preset === item.id
                          ? "bg-bg-surface text-text-primary shadow-sm"
                          : "text-text-muted hover:text-text-secondary",
                      ].join(" ")}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {preset === "custom" && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-text-secondary">
                      From
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) =>
                        setCustomRange(e.target.value, customEnd)
                      }
                      className="w-full rounded-md border border-border bg-bg-surface px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-text-secondary">
                      To
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) =>
                        setCustomRange(customStart, e.target.value)
                      }
                      className="w-full rounded-md border border-border bg-bg-surface px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating || customDisabled || !isOnline}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BarChart2 className="h-4 w-4" />
                )}
                Generate Report
              </button>
              {!isOnline && (
                <p className="text-center text-xs text-warning">
                  Requires internet connection.
                </p>
              )}
            </div>
          </div>

          <div className="mx-auto w-full max-w-2xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary">
                Report history ({reports.length})
              </span>
            </div>
            <ReportHistory />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl space-y-4">
            {viewingCachedId && (
              <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent-subtle px-3 py-2">
                <span className="text-xs font-medium text-accent">
                  Cached report — generated {formatDate(report.generatedAt)}
                </span>
              </div>
            )}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-bg-surface p-4">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {formatDate(report.timeframe.start)} –{" "}
                  {formatDate(report.timeframe.end)}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Generated {formatDate(report.generatedAt)}
                </p>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <EfficiencyGauge score={report.metrics.efficiencyScore} />
              <div className="flex flex-col gap-3">
                <MetricCard
                  label="Total completed"
                  value={String(report.metrics.totalCompleted)}
                />
                <MetricCard
                  label="Mean variance"
                  value={signedMinutes(report.metrics.overallVariance)}
                />
              </div>
            </div>

            <MetricCard
              label="Mean absolute variance"
              value={`${Math.round(report.metrics.meanAbsoluteVariance)}m`}
            />

            <PriorityBreakdown byPriority={report.metrics.byPriority} />

            <PatternsSection patterns={report.patterns} />

            <AdviceSection advice={report.advice} />

            <div className="rounded-lg border border-border bg-bg-surface p-4">
              <span className="text-xs font-medium text-text-secondary">
                Summary
              </span>
              <p className="mt-2 text-sm leading-relaxed text-text-primary">
                {report.summary}
              </p>
            </div>
          </div>
        </div>
      )}

      {showReplaceConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-lg border border-border bg-bg-elevated p-5 shadow-2xl">
            <p className="text-sm font-medium text-text-primary">
              Replace existing report?
            </p>
            <p className="mt-1 text-xs text-text-muted">
              A report for this timeframe already exists. Generating a new one
              will replace it.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowReplaceConfirm(false)}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Cancel
              </button>
              <button
                onClick={runGenerate}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

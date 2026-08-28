interface PomodoroProgressProps {
  label: string;
  secondsRemaining: number;
  totalSeconds: number;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PomodoroProgress({ label, secondsRemaining, totalSeconds }: PomodoroProgressProps) {
  const radius = 112;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, secondsRemaining / totalSeconds));

  return (
    <div className="relative h-64 w-64" role="timer" aria-label={`${label}: ${formatTime(secondsRemaining)} remaining`}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 256 256" aria-hidden="true">
        <circle cx="128" cy="128" r={radius} fill="none" stroke="var(--color-bg-tertiary)" strokeWidth="8" />
        <circle
          cx="128"
          cy="128"
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeLinecap="round"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">{label}</span>
        <span className="mt-1 font-mono text-5xl font-semibold tracking-tight text-text-primary">{formatTime(secondsRemaining)}</span>
      </div>
    </div>
  );
}

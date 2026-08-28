import { useEffect, useState } from "react";
import {
  type PomodoroDurationErrors,
  type PomodoroDurationField,
  type PomodoroDurations,
  usePomodoroStore,
  validatePomodoroDurations,
} from "../stores/pomodoroStore";
import { useToastStore } from "../stores/toastStore";

interface DurationFieldConfig {
  field: PomodoroDurationField;
  label: string;
  description: string;
  maximum: number;
}

const DURATION_FIELDS: DurationFieldConfig[] = [
  {
    field: "focusMinutes",
    label: "Focus time",
    description: "Length of each focus session.",
    maximum: 180,
  },
  {
    field: "shortBreakMinutes",
    label: "Short break",
    description: "Break after most focus sessions.",
    maximum: 60,
  },
  {
    field: "longBreakMinutes",
    label: "Long break",
    description: "Break after every fourth focus session.",
    maximum: 60,
  },
];

type DurationDraft = Record<PomodoroDurationField, string>;

function createDraft(durations: PomodoroDurations): DurationDraft {
  return {
    focusMinutes: String(durations.focusMinutes),
    shortBreakMinutes: String(durations.shortBreakMinutes),
    longBreakMinutes: String(durations.longBreakMinutes),
  };
}

function validateDraft(draft: DurationDraft): PomodoroDurationErrors {
  const parsed = {} as PomodoroDurations;
  const errors: PomodoroDurationErrors = {};

  for (const { field } of DURATION_FIELDS) {
    if (!/^\d+$/.test(draft[field])) {
      errors[field] = "Enter a whole number of minutes.";
    } else {
      parsed[field] = Number(draft[field]);
    }
  }

  return {
    ...errors,
    ...validatePomodoroDurations(parsed),
  };
}

function parseDraft(draft: DurationDraft): PomodoroDurations {
  return {
    focusMinutes: Number(draft.focusMinutes),
    shortBreakMinutes: Number(draft.shortBreakMinutes),
    longBreakMinutes: Number(draft.longBreakMinutes),
  };
}

export function PomodoroSettings() {
  const durations = usePomodoroStore((state) => state.durations);
  const saveDurations = usePomodoroStore((state) => state.saveDurations);
  const [draft, setDraft] = useState<DurationDraft>(() =>
    createDraft(durations),
  );
  const [touched, setTouched] = useState<
    Partial<Record<PomodoroDurationField, boolean>>
  >({});

  useEffect(() => {
    setDraft(createDraft(durations));
    setTouched({});
  }, [durations]);

  const errors = validateDraft(draft);
  const hasErrors = Object.keys(errors).length > 0;
  const isDirty = DURATION_FIELDS.some(
    ({ field }) => draft[field] !== String(durations[field]),
  );

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({
      focusMinutes: true,
      shortBreakMinutes: true,
      longBreakMinutes: true,
    });
    if (hasErrors || !isDirty) return;

    if (saveDurations(parseDraft(draft))) {
      useToastStore.getState().addToast("success", "Pomodoro durations saved.");
    }
  };

  return (
    <section className="rounded-xl border border-border bg-bg-surface p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Pomodoro timer
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Set each interval in whole minutes. Active and paused intervals keep
          their current time until you reset, skip, or finish them.
        </p>
      </div>
      <form className="mt-5 space-y-4" onSubmit={handleSave} noValidate>
        {DURATION_FIELDS.map(({ field, label, description, maximum }) => {
          const error = errors[field];
          const errorId = `${field}-error`;
          return (
            <div key={field}>
              <label
                className="block text-sm font-medium text-text-primary"
                htmlFor={field}
              >
                {label}
              </label>
              <p className="mt-0.5 text-xs text-text-muted">{description}</p>
              <div className="mt-1.5 flex max-w-xs items-center gap-2">
                <input
                  id={field}
                  type="number"
                  min="1"
                  max={maximum}
                  step="1"
                  inputMode="numeric"
                  value={draft[field]}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  onBlur={() =>
                    setTouched((current) => ({ ...current, [field]: true }))
                  }
                  aria-invalid={touched[field] && error ? true : undefined}
                  aria-describedby={
                    touched[field] && error ? errorId : undefined
                  }
                  className={`w-24 rounded-md border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-surface ${
                    touched[field] && error ? "border-danger" : "border-border"
                  }`}
                />
                <span className="text-sm text-text-muted">minutes</span>
              </div>
              {touched[field] && error && (
                <p
                  id={errorId}
                  className="mt-1.5 text-xs text-danger"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </div>
          );
        })}
        <button
          type="submit"
          disabled={!isDirty || hasErrors}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save durations
        </button>
      </form>
    </section>
  );
}

import { BrowserWindow } from "electron";
import { getDb } from "@/main/db/database";
import * as timeLogRepo from "@/main/db/time-log-repository";
import * as taskRepo from "@/main/db/task-repository";
import type { Task } from "@/shared/models";

export interface ActiveTimerState {
  taskId: string;
  logId: string;
  startedAt: number;
}

let activeTimer: ActiveTimerState | null = null;
let tickInterval: NodeJS.Timeout | null = null;

function broadcastTick(taskId: string, elapsedSeconds: number) {
  try {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send("timer:tick", { taskId, elapsedSeconds });
      }
    }
  } catch {
    // Safely ignore if BrowserWindow is unavailable (e.g. unit tests)
  }
}

function startTickLoop() {
  stopTickLoop();
  tickInterval = setInterval(() => {
    if (!activeTimer) {
      stopTickLoop();
      return;
    }
    const elapsedSeconds = Math.floor(
      (Date.now() - activeTimer.startedAt) / 1000,
    );
    broadcastTick(activeTimer.taskId, elapsedSeconds);
  }, 1000);
}

function stopTickLoop() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

function applyActiveTimer(
  nextTimer: ActiveTimerState | null,
  stoppedTaskIds: string[] = [],
) {
  stopTickLoop();

  for (const taskId of stoppedTaskIds) {
    broadcastTick(taskId, 0);
  }

  activeTimer = nextTimer;
  if (!activeTimer) return;

  startTickLoop();
  const elapsedSeconds = Math.floor(
    (Date.now() - activeTimer.startedAt) / 1000,
  );
  broadcastTick(activeTimer.taskId, elapsedSeconds);
}

function closeUnclosedLog(taskId: string, pausedAt: number): boolean {
  const unclosed = timeLogRepo.getUnclosedTimeLog(taskId);
  if (!unclosed) return false;
  timeLogRepo.pauseTimeLog(unclosed.id, pausedAt);
  return true;
}

interface StartTaskResult {
  task: Task;
  logId: string;
}

export function startTask(
  patch: Partial<Task> & { id: string },
): StartTaskResult {
  const db = getDb();
  const stoppedTaskIds: string[] = [];

  const start = db.transaction(() => {
    // Updating the target first validates the full patch, including the
    // Today-only guard, before the current timer is disturbed.
    const startedTask = taskRepo.updateTask({
      ...patch,
      status: "in_progress",
    });
    const now = Date.now();

    for (const other of taskRepo.getTasks()) {
      if (other.id === patch.id || other.status !== "in_progress") continue;

      closeUnclosedLog(other.id, now);
      taskRepo.updateTask({ id: other.id, status: "todo" });
      stoppedTaskIds.push(other.id);
    }

    const startedLog =
      timeLogRepo.getUnclosedTimeLog(patch.id) ??
      timeLogRepo.createTimeLog(patch.id, now);

    return { task: startedTask, log: startedLog };
  });

  const { task: startedTask, log: startedLog } = start();

  applyActiveTimer(
    {
      taskId: patch.id,
      logId: startedLog.id,
      startedAt: startedLog.startedAt,
    },
    stoppedTaskIds,
  );

  return { task: startedTask, logId: startedLog.id };
}

export function updateTaskWithTimerEffects(
  patch: Partial<Task> & { id: string },
): Task {
  if (patch.status === "in_progress") {
    return startTask(patch).task;
  }

  const existing = taskRepo.getTaskById(patch.id);
  const isReturningToBacklog =
    "scheduledDate" in patch && patch.scheduledDate === null;
  const isLeavingInProgress =
    existing.status === "in_progress" &&
    (patch.status === "todo" || patch.status === "completed");

  if (!isReturningToBacklog && !isLeavingInProgress) {
    return taskRepo.updateTask(patch);
  }

  const db = getDb();
  const shouldStopTimer =
    existing.status === "in_progress" ||
    timeLogRepo.getUnclosedTimeLog(existing.id) !== null;

  const update = db.transaction((): Task => {
    if (shouldStopTimer) {
      closeUnclosedLog(existing.id, Date.now());
    }

    return taskRepo.updateTask({
      ...patch,
      ...(isReturningToBacklog && existing.status === "in_progress"
        ? { status: "todo" as const }
        : {}),
    });
  });

  const updatedTask = update();

  if (shouldStopTimer && activeTimer?.taskId === existing.id) {
    applyActiveTimer(null, [existing.id]);
  }

  return updatedTask;
}

export function startTimer(taskId: string): { logId: string } {
  const result = startTask({ id: taskId });
  return { logId: result.logId };
}

export function pauseTimer(taskId?: string): { durationMinutes: number } {
  const targetTaskId = taskId ?? activeTimer?.taskId;

  if (!targetTaskId) {
    throw Object.assign(new Error("No active timer to pause."), {
      code: "NOT_FOUND",
    });
  }

  let logToPauseId: string | null = null;
  if (activeTimer && activeTimer.taskId === targetTaskId) {
    logToPauseId = activeTimer.logId;
  } else {
    const unclosed = timeLogRepo.getUnclosedTimeLog(targetTaskId);
    if (unclosed) {
      logToPauseId = unclosed.id;
    }
  }

  if (!logToPauseId) {
    throw Object.assign(new Error("No active timer found for task."), {
      code: "NOT_FOUND",
    });
  }

  const pause = getDb().transaction(() =>
    timeLogRepo.pauseTimeLog(logToPauseId),
  );
  const pausedLog = pause();
  const durationMinutes = pausedLog.durationMinutes ?? 0;

  if (activeTimer && activeTimer.taskId === targetTaskId) {
    applyActiveTimer(null, [targetTaskId]);
  }

  return { durationMinutes };
}

export function getActiveTimer(): {
  taskId: string;
  logId: string;
  startedAt: number;
  elapsedSeconds: number;
} | null {
  if (!activeTimer) {
    const unclosed = timeLogRepo.getUnclosedTimeLog();
    if (unclosed) {
      const task = taskRepo.getTasks().find((t) => t.id === unclosed.taskId);
      if (
        task &&
        task.status === "in_progress" &&
        task.scheduledDate !== null
      ) {
        activeTimer = {
          taskId: unclosed.taskId,
          logId: unclosed.id,
          startedAt: unclosed.startedAt,
        };
        startTickLoop();
      } else {
        timeLogRepo.pauseTimeLog(unclosed.id);
        if (task?.status === "in_progress") {
          taskRepo.updateTask({ id: task.id, status: "todo" });
        }
        return null;
      }
    } else {
      return null;
    }
  }

  const elapsedSeconds = Math.floor(
    (Date.now() - activeTimer.startedAt) / 1000,
  );
  return {
    taskId: activeTimer.taskId,
    logId: activeTimer.logId,
    startedAt: activeTimer.startedAt,
    elapsedSeconds,
  };
}

export function stopTimerEngine() {
  if (activeTimer) {
    try {
      timeLogRepo.pauseTimeLog(activeTimer.logId);
    } catch {
      // ignore
    }
    activeTimer = null;
  }
  stopTickLoop();
}

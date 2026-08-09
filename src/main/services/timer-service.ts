import { BrowserWindow } from "electron";
import * as timeLogRepo from "@/main/db/time-log-repository";
import * as taskRepo from "@/main/db/task-repository";

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

export function startTimer(taskId: string): { logId: string } {
  const tasks = taskRepo.getTasks();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    throw Object.assign(new Error("Task not found."), { code: "NOT_FOUND" });
  }

  // If another timer is active, pause it
  if (activeTimer && activeTimer.taskId !== taskId) {
    pauseTimer(activeTimer.taskId);
  }

  // If already active for this task, return logId
  if (activeTimer && activeTimer.taskId === taskId) {
    return { logId: activeTimer.logId };
  }

  // Check for existing unclosed log
  let unclosed = timeLogRepo.getUnclosedTimeLog(taskId);
  if (!unclosed) {
    unclosed = timeLogRepo.createTimeLog(taskId);
  }

  activeTimer = {
    taskId,
    logId: unclosed.id,
    startedAt: unclosed.startedAt,
  };

  // Ensure task is in_progress
  if (task.status !== "in_progress") {
    taskRepo.updateTask({ id: taskId, status: "in_progress" });
  }

  startTickLoop();
  const elapsedSeconds = Math.floor(
    (Date.now() - activeTimer.startedAt) / 1000,
  );
  broadcastTick(taskId, elapsedSeconds);

  return { logId: activeTimer.logId };
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

  const pausedLog = timeLogRepo.pauseTimeLog(logToPauseId);
  const durationMinutes = pausedLog.durationMinutes ?? 0;

  if (activeTimer && activeTimer.taskId === targetTaskId) {
    stopTickLoop();
    broadcastTick(targetTaskId, 0);
    activeTimer = null;
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
      if (task && task.status === "in_progress") {
        activeTimer = {
          taskId: unclosed.taskId,
          logId: unclosed.id,
          startedAt: unclosed.startedAt,
        };
        startTickLoop();
      } else {
        timeLogRepo.pauseTimeLog(unclosed.id);
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

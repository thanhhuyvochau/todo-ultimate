import { app, shell, BrowserWindow } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { initDb } from "./db/database";
import { registerIpcHandlers } from "./ipc/register-ipc";
import { handlers } from "./ipc/handlers";
import { isEncryptionAvailable } from "./services/keychain-service";
import { instantiateDailyTasks } from "./services/recurring-engine";
import { getActiveTimer, stopTimerEngine } from "./services/timer-service";
import {
  GOOGLE_CALENDAR_REDIRECT_URI,
  handleGoogleCalendarCallback,
  startGoogleCalendarSync,
  stopGoogleCalendarSync,
} from "./services/google-calendar-service";

const GOOGLE_CALENDAR_PROTOCOL = "com.ai-task-planner";

function handleProtocolUrl(url: string): void {
  if (!url.startsWith(GOOGLE_CALENDAR_REDIRECT_URI)) return;
  void handleGoogleCalendarCallback(url).catch((error: unknown) => {
    console.warn(
      "Google Calendar callback could not be processed:",
      error instanceof Error ? error.message : "unknown error",
    );
  });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

app.on("second-instance", (_event, commandLine) => {
  const callbackUrl = commandLine.find((argument) =>
    argument.startsWith(GOOGLE_CALENDAR_REDIRECT_URI),
  );
  if (callbackUrl) handleProtocolUrl(callbackUrl);
});

app.on("open-url", (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url);
});

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.ai-task-planner");
  app.setAsDefaultProtocolClient(GOOGLE_CALENDAR_PROTOCOL);

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  if (!isEncryptionAvailable()) {
    throw new Error(
      "OS keychain encryption is not available. This application requires secure storage " +
        "for API keys and cannot run without it. Please ensure your operating system supports " +
        "native keychain/credential storage.",
    );
  }

  try {
    initDb();
    instantiateDailyTasks();
    getActiveTimer(); // Restore timer state if unclosed log exists
    startGoogleCalendarSync();
  } catch (err) {
    console.error(
      "Failed to initialize application database. The app will not function correctly.",
      err,
    );
  }

  registerIpcHandlers(handlers);

  createWindow();

  let lastCheckDate = new Date().toDateString();
  setInterval(() => {
    const today = new Date().toDateString();
    if (today !== lastCheckDate) {
      lastCheckDate = today;
      instantiateDailyTasks();
    }
  }, 60_000);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  stopTimerEngine();
  stopGoogleCalendarSync();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

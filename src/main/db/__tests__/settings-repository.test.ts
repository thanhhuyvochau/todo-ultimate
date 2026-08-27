import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import Database from "better-sqlite3";

const testDbReady = vi.fn<() => Database.Database>();

vi.mock("../database", () => ({
  getDb: () => testDbReady(),
  initDb: () => testDbReady(),
}));

vi.mock("@/main/services/keychain-service", () => ({
  getAllKeyStatus: vi.fn(() => ({
    deepseek: true,
    openai: false,
    anthropic: false,
    gemini: false,
    custom: false,
  })),
}));

let db: Database.Database;

async function getRepo() {
  return await import("../settings-repository");
}

beforeEach(() => {
  db = new Database(":memory:");
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  testDbReady.mockReturnValue(db);
});

afterAll(() => {
  if (db && db.open) db.close();
});

describe("settings-repository", () => {
  it("getSetting returns default when not set", async () => {
    const repo = await getRepo();
    const val = repo.getSetting("non_existent", { fallback: 123 });
    expect(val).toEqual({ fallback: 123 });
  });

  it("setSetting stores and getSetting retrieves value", async () => {
    const repo = await getRepo();
    repo.setSetting("custom_key", { theme: "dark", count: 5 });
    const val = repo.getSetting("custom_key", {});
    expect(val).toEqual({ theme: "dark", count: 5 });
  });

  it("getAiSettings returns all preset providers with defaults", async () => {
    const repo = await getRepo();
    const settings = repo.getAiSettings();
    expect(settings.activeProvider).toBe("deepseek");
    expect(settings.providers.deepseek.selectedModel).toBe("deepseek-chat");
    expect(settings.providers.deepseek.hasKey).toBe(true);
    expect(settings.providers.openai.selectedModel).toBe("gpt-4o");
    expect(settings.providers.anthropic.selectedModel).toBe(
      "claude-3-7-sonnet-latest",
    );
    expect(settings.providers.gemini.selectedModel).toBe("gemini-2.0-flash");
    expect(settings.providers.custom.selectedModel).toBe("llama3.2");
  });

  it("updateAiSettings updates active provider and model", async () => {
    const repo = await getRepo();
    repo.updateAiSettings({
      activeProvider: "openai",
      providerConfig: {
        providerId: "openai",
        selectedModel: "gpt-4o-mini",
      },
    });

    const updated = repo.getAiSettings();
    expect(updated.activeProvider).toBe("openai");
    expect(updated.providers.openai.selectedModel).toBe("gpt-4o-mini");
  });
});

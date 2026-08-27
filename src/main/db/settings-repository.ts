import { getDb } from "./database";
import type {
  AiProviderId,
  AiSettings,
  ProviderConfig,
  UpdateAiSettingsInput,
} from "@/shared/models";
import { DEFAULT_PROVIDER_PRESETS } from "@/shared/models";
import * as keychainService from "@/main/services/keychain-service";

interface AppSettingRow {
  key: string;
  value: string;
  updated_at: number;
}

const AI_SETTINGS_KEY = "ai_settings";

export function getSetting<T>(key: string, defaultValue: T): T {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get(key) as AppSettingRow | undefined;
  if (!row) {
    return defaultValue;
  }
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return defaultValue;
  }
}

export function setSetting<T>(key: string, value: T): void {
  const db = getDb();
  const now = Date.now();
  const jsonValue = JSON.stringify(value);
  db.prepare(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(key, jsonValue, now);
}

export function deleteSetting(key: string): void {
  const db = getDb();
  db.prepare("DELETE FROM app_settings WHERE key = ?").run(key);
}

export function getDefaultAiSettings(): AiSettings {
  const providers = {} as Record<AiProviderId, ProviderConfig>;
  const keyStatus = keychainService.getAllKeyStatus();

  for (const [id, preset] of Object.entries(DEFAULT_PROVIDER_PRESETS) as [
    AiProviderId,
    (typeof DEFAULT_PROVIDER_PRESETS)[AiProviderId],
  ][]) {
    providers[id] = {
      providerId: id,
      selectedModel: preset.defaultModel,
      baseUrl: preset.isCustomUrlAllowed ? preset.defaultBaseUrl : undefined,
      hasKey: keyStatus[id] ?? false,
    };
  }

  return {
    activeProvider: "deepseek",
    providers,
  };
}

export function getAiSettings(): AiSettings {
  const defaults = getDefaultAiSettings();
  const saved = getSetting<Partial<AiSettings>>(AI_SETTINGS_KEY, {});
  const keyStatus = keychainService.getAllKeyStatus();

  const activeProvider: AiProviderId =
    saved.activeProvider && saved.activeProvider in DEFAULT_PROVIDER_PRESETS
      ? saved.activeProvider
      : defaults.activeProvider;

  const mergedProviders = { ...defaults.providers };

  if (saved.providers) {
    for (const [idStr, savedConfig] of Object.entries(saved.providers)) {
      const id = idStr as AiProviderId;
      if (id in mergedProviders && savedConfig) {
        mergedProviders[id] = {
          ...mergedProviders[id],
          selectedModel:
            savedConfig.selectedModel || mergedProviders[id].selectedModel,
          baseUrl:
            savedConfig.baseUrl !== undefined
              ? savedConfig.baseUrl
              : mergedProviders[id].baseUrl,
          hasKey: keyStatus[id] ?? false,
        };
      }
    }
  }

  // Ensure key statuses are up to date
  for (const id of Object.keys(mergedProviders) as AiProviderId[]) {
    mergedProviders[id].hasKey = keyStatus[id] ?? false;
  }

  return {
    activeProvider,
    providers: mergedProviders,
  };
}

export function updateAiSettings(input: UpdateAiSettingsInput): AiSettings {
  const current = getAiSettings();

  if (
    input.activeProvider &&
    input.activeProvider in DEFAULT_PROVIDER_PRESETS
  ) {
    current.activeProvider = input.activeProvider;
  }

  if (input.providerConfig) {
    const { providerId, selectedModel, baseUrl } = input.providerConfig;
    if (providerId in current.providers) {
      if (selectedModel) {
        current.providers[providerId].selectedModel = selectedModel.trim();
      }
      if (baseUrl !== undefined) {
        current.providers[providerId].baseUrl = baseUrl.trim() || undefined;
      }
    }
  }

  // Persist non-sensitive parts
  const persistPayload = {
    activeProvider: current.activeProvider,
    providers: Object.fromEntries(
      Object.entries(current.providers).map(([k, v]) => [
        k,
        { selectedModel: v.selectedModel, baseUrl: v.baseUrl },
      ]),
    ),
  };

  setSetting(AI_SETTINGS_KEY, persistPayload);
  return getAiSettings();
}

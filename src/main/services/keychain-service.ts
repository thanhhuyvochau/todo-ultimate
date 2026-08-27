import { safeStorage, app } from "electron";
import { join } from "path";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import type { AiProviderId } from "@/shared/models";

const VAULT_FILE = ".encrypted-vault";
const LEGACY_FILES = [".envrypted-key", ".encrypted-key"];

function getVaultPath(): string {
  return join(app.getPath("userData"), VAULT_FILE);
}

function getLegacyPath(fileName: string): string {
  return join(app.getPath("userData"), fileName);
}

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

function assertEncryptionAvailable(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw Object.assign(
      new Error(
        "OS keychain is not available. Cannot securely store the API key.",
      ),
      { code: "KEYCHAIN_UNAVAILABLE" },
    );
  }
}

function readVaultRaw(): Record<string, string> {
  assertEncryptionAvailable();
  migrateLegacyIfNeeded();

  const path = getVaultPath();
  if (!existsSync(path)) {
    return {};
  }

  try {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as {
      encryptedVault: string;
    };
    const decryptedJson = safeStorage.decryptString(
      Buffer.from(raw.encryptedVault, "base64"),
    );
    return JSON.parse(decryptedJson) as Record<string, string>;
  } catch {
    console.warn("Keychain file is corrupted. Unable to decrypt API key.");
    return {};
  }
}

function writeVaultRaw(vault: Record<string, string>): void {
  assertEncryptionAvailable();
  const path = getVaultPath();

  if (Object.keys(vault).length === 0) {
    if (existsSync(path)) {
      try {
        unlinkSync(path);
      } catch {
        throw Object.assign(
          new Error("Failed to delete the encrypted API key file."),
          { code: "KEYCHAIN_WRITE_FAILED" },
        );
      }
    }
    return;
  }

  try {
    const jsonStr = JSON.stringify(vault);
    const encrypted = safeStorage.encryptString(jsonStr);
    writeFileSync(
      path,
      JSON.stringify({ encryptedVault: encrypted.toString("base64") }),
    );
  } catch {
    throw Object.assign(
      new Error("Failed to write encrypted API key to disk."),
      { code: "KEYCHAIN_WRITE_FAILED" },
    );
  }
}

function migrateLegacyIfNeeded(): void {
  for (const legacyName of LEGACY_FILES) {
    const legacyPath = getLegacyPath(legacyName);
    if (existsSync(legacyPath)) {
      try {
        const raw = JSON.parse(readFileSync(legacyPath, "utf-8")) as {
          encryptedKey: string;
        };
        const key = safeStorage.decryptString(
          Buffer.from(raw.encryptedKey, "base64"),
        );
        if (key) {
          const vaultPath = getVaultPath();
          let currentVault: Record<string, string> = {};
          if (existsSync(vaultPath)) {
            try {
              const vaultRaw = JSON.parse(readFileSync(vaultPath, "utf-8")) as {
                encryptedVault: string;
              };
              const decrypted = safeStorage.decryptString(
                Buffer.from(vaultRaw.encryptedVault, "base64"),
              );
              currentVault = JSON.parse(decrypted) as Record<string, string>;
            } catch {
              currentVault = {};
            }
          }
          currentVault["deepseek"] = key;
          const encrypted = safeStorage.encryptString(
            JSON.stringify(currentVault),
          );
          writeFileSync(
            vaultPath,
            JSON.stringify({ encryptedVault: encrypted.toString("base64") }),
          );
        }
        unlinkSync(legacyPath);
      } catch {
        // Ignore legacy migration error
      }
    }
  }
}

export function setApiKey(providerOrKey: string, maybeKey?: string): void {
  assertEncryptionAvailable();
  const provider = maybeKey !== undefined ? providerOrKey : "deepseek";
  const key = maybeKey !== undefined ? maybeKey : providerOrKey;

  const vault = readVaultRaw();
  vault[provider] = key;
  writeVaultRaw(vault);
}

export function getApiKey(provider = "deepseek"): string | null {
  assertEncryptionAvailable();
  const vault = readVaultRaw();
  return vault[provider] ?? null;
}

export function deleteApiKey(provider?: string): void {
  assertEncryptionAvailable();
  if (!provider) {
    // Delete entire vault
    writeVaultRaw({});
    return;
  }
  const vault = readVaultRaw();
  if (vault[provider]) {
    delete vault[provider];
    writeVaultRaw(vault);
  }
}

export function hasApiKey(provider: string): boolean {
  try {
    const key = getApiKey(provider);
    return Boolean(key && key.trim().length > 0);
  } catch {
    return false;
  }
}

export function isApiKeySet(provider?: string): boolean {
  try {
    if (provider) {
      return hasApiKey(provider);
    }
    const vault = readVaultRaw();
    return Object.keys(vault).length > 0;
  } catch {
    return false;
  }
}

export function getAllKeyStatus(): Record<AiProviderId, boolean> {
  try {
    const vault = readVaultRaw();
    return {
      deepseek: Boolean(vault["deepseek"]?.trim()),
      openai: Boolean(vault["openai"]?.trim()),
      anthropic: Boolean(vault["anthropic"]?.trim()),
      gemini: Boolean(vault["gemini"]?.trim()),
      custom: Boolean(vault["custom"]?.trim()),
    };
  } catch {
    return {
      deepseek: false,
      openai: false,
      anthropic: false,
      gemini: false,
      custom: false,
    };
  }
}

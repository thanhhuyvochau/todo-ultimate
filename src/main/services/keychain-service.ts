import { safeStorage, app } from "electron";
import { join } from "path";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";

const KEYCHAIN_FILE = "keychain.json";

function getKeychainPath(): string {
  return join(app.getPath("userData"), KEYCHAIN_FILE);
}

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export function setApiKey(apiKey: string): { success: boolean } {
  if (!safeStorage.isEncryptionAvailable()) {
    throw Object.assign(
      new Error(
        "OS keychain is not available. Cannot securely store the API key.",
      ),
      {
        code: "KEYCHAIN_UNAVAILABLE",
      },
    );
  }

  const encrypted = safeStorage.encryptString(apiKey);
  writeFileSync(
    getKeychainPath(),
    JSON.stringify({ encryptedKey: encrypted.toString("base64") }),
  );

  return { success: true };
}

export function getApiKey(): { hasKey: boolean } {
  const path = getKeychainPath();
  return { hasKey: existsSync(path) };
}

export function getDecryptedApiKey(): string | null {
  if (!safeStorage.isEncryptionAvailable()) {
    throw Object.assign(new Error("OS keychain is not available."), {
      code: "KEYCHAIN_UNAVAILABLE",
    });
  }

  const path = getKeychainPath();
  if (!existsSync(path)) {
    return null;
  }

  const raw = JSON.parse(readFileSync(path, "utf-8")) as {
    encryptedKey: string;
  };
  return safeStorage.decryptString(Buffer.from(raw.encryptedKey, "base64"));
}

export function deleteApiKey(): { success: boolean } {
  if (!safeStorage.isEncryptionAvailable()) {
    throw Object.assign(new Error("OS keychain is not available."), {
      code: "KEYCHAIN_UNAVAILABLE",
    });
  }

  const path = getKeychainPath();
  if (existsSync(path)) {
    unlinkSync(path);
  }

  return { success: true };
}

import { safeStorage, app } from "electron";
import { join } from "path";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";

const KEYCHAIN_FILE = ".envrypted-key";

function getKeychainPath(): string {
  return join(app.getPath("userData"), KEYCHAIN_FILE);
}

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export function setApiKey(key: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw Object.assign(
      new Error(
        "OS keychain is not available. Cannot securely store the API key.",
      ),
      { code: "KEYCHAIN_UNAVAILABLE" },
    );
  }

  const encrypted = safeStorage.encryptString(key);
  try {
    writeFileSync(
      getKeychainPath(),
      JSON.stringify({ encryptedKey: encrypted.toString("base64") }),
    );
  } catch {
    throw Object.assign(
      new Error("Failed to write encrypted API key to disk."),
      { code: "KEYCHAIN_WRITE_FAILED" },
    );
  }
}

export function getApiKey(): string | null {
  if (!safeStorage.isEncryptionAvailable()) {
    throw Object.assign(new Error("OS keychain is not available."), {
      code: "KEYCHAIN_UNAVAILABLE",
    });
  }

  const path = getKeychainPath();
  if (!existsSync(path)) {
    return null;
  }

  try {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as {
      encryptedKey: string;
    };
    return safeStorage.decryptString(Buffer.from(raw.encryptedKey, "base64"));
  } catch {
    console.warn("Keychain file is corrupted. Unable to decrypt API key.");
    return null;
  }
}

export function deleteApiKey(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw Object.assign(new Error("OS keychain is not available."), {
      code: "KEYCHAIN_UNAVAILABLE",
    });
  }

  const path = getKeychainPath();
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
}

export function isApiKeySet(): boolean {
  return existsSync(getKeychainPath());
}

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockExistsSync = vi.fn<(...args: unknown[]) => boolean>();
const mockReadFileSync = vi.fn<(...args: unknown[]) => string>();
const mockWriteFileSync = vi.fn<(...args: unknown[]) => void>();
const mockUnlinkSync = vi.fn<(...args: unknown[]) => void>();
const mockIsEncryptionAvailable = vi.fn<() => boolean>();
const mockEncryptString = vi.fn<(value: string) => Buffer>();
const mockDecryptString = vi.fn<(buffer: Buffer) => string>();
const mockGetPath = vi.fn<(name: string) => string>();

vi.mock("fs", () => {
  const mockedFs = {
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
    writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
    unlinkSync: (...args: unknown[]) => mockUnlinkSync(...args),
  };
  return { ...mockedFs, default: mockedFs };
});

vi.mock("electron", () => ({
  safeStorage: {
    isEncryptionAvailable: () => mockIsEncryptionAvailable(),
    encryptString: (v: string) => mockEncryptString(v),
    decryptString: (b: Buffer) => mockDecryptString(b),
  },
  app: {
    getPath: (n: string) => mockGetPath(n),
  },
}));

vi.mock("path", async () => {
  const actual = await vi.importActual("path");
  return actual;
});

import {
  isEncryptionAvailable,
  setApiKey,
  getApiKey,
  deleteApiKey,
  isApiKeySet,
  hasApiKey,
  getAllKeyStatus,
} from "../keychain-service";

const USER_DATA = "/mock/userData";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPath.mockReturnValue(USER_DATA);
});

describe("isEncryptionAvailable", () => {
  it("returns true when safeStorage says so", () => {
    mockIsEncryptionAvailable.mockReturnValue(true);
    expect(isEncryptionAvailable()).toBe(true);
  });

  it("returns false when safeStorage says so", () => {
    mockIsEncryptionAvailable.mockReturnValue(false);
    expect(isEncryptionAvailable()).toBe(false);
  });
});

describe("setApiKey", () => {
  it("encrypts the key and writes it to the multi-vault", () => {
    mockIsEncryptionAvailable.mockReturnValue(true);
    mockEncryptString.mockReturnValue(Buffer.from("encrypted-data"));
    mockExistsSync.mockReturnValue(false);

    setApiKey("my-secret-key");

    expect(mockEncryptString).toHaveBeenCalled();
    expect(mockWriteFileSync).toHaveBeenCalled();
  });

  it("stores keys per provider", () => {
    mockIsEncryptionAvailable.mockReturnValue(true);
    mockEncryptString.mockReturnValue(Buffer.from("encrypted-data"));
    mockExistsSync.mockReturnValue(false);

    setApiKey("openai", "sk-openai-key");

    expect(mockEncryptString).toHaveBeenCalledWith(
      JSON.stringify({ openai: "sk-openai-key" }),
    );
  });

  it("throws KEYCHAIN_UNAVAILABLE if encryption is not available", () => {
    mockIsEncryptionAvailable.mockReturnValue(false);

    let thrown: { code?: string; message?: string } | null = null;
    try {
      setApiKey("key");
    } catch (err) {
      thrown = err as { code: string; message: string };
    }

    expect(thrown).not.toBeNull();
    expect(thrown!.code).toBe("KEYCHAIN_UNAVAILABLE");
  });
});

describe("getApiKey", () => {
  it("returns null when no vault file exists", () => {
    mockIsEncryptionAvailable.mockReturnValue(true);
    mockExistsSync.mockReturnValue(false);

    expect(getApiKey()).toBeNull();
  });

  it("returns decrypted key for deepseek by default", () => {
    mockIsEncryptionAvailable.mockReturnValue(true);
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        encryptedVault: Buffer.from("vault-data").toString("base64"),
      }),
    );
    mockDecryptString.mockReturnValue(
      JSON.stringify({ deepseek: "my-ds-key", openai: "my-oa-key" }),
    );

    expect(getApiKey()).toBe("my-ds-key");
    expect(getApiKey("openai")).toBe("my-oa-key");
    expect(getApiKey("anthropic")).toBeNull();
  });

  it("returns null when JSON is corrupt", () => {
    mockIsEncryptionAvailable.mockReturnValue(true);
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("not valid json {{{");

    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    const result = getApiKey();

    expect(result).toBeNull();
    expect(consoleWarn).toHaveBeenCalledWith(
      "Keychain file is corrupted. Unable to decrypt API key.",
    );

    consoleWarn.mockRestore();
  });
});

describe("deleteApiKey", () => {
  it("removes a specific provider key and preserves others", () => {
    mockIsEncryptionAvailable.mockReturnValue(true);
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        encryptedVault: Buffer.from("vault-data").toString("base64"),
      }),
    );
    mockDecryptString.mockReturnValue(
      JSON.stringify({ deepseek: "my-ds-key", openai: "my-oa-key" }),
    );
    mockEncryptString.mockReturnValue(Buffer.from("updated-vault"));

    deleteApiKey("openai");

    expect(mockEncryptString).toHaveBeenCalledWith(
      JSON.stringify({ deepseek: "my-ds-key" }),
    );
  });

  it("deletes vault file when last key is removed", () => {
    mockIsEncryptionAvailable.mockReturnValue(true);
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        encryptedVault: Buffer.from("vault-data").toString("base64"),
      }),
    );
    mockDecryptString.mockReturnValue(
      JSON.stringify({ deepseek: "my-ds-key" }),
    );

    deleteApiKey("deepseek");

    expect(mockUnlinkSync).toHaveBeenCalled();
  });
});

describe("getAllKeyStatus & hasApiKey", () => {
  it("reports key presence per provider", () => {
    mockIsEncryptionAvailable.mockReturnValue(true);
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        encryptedVault: Buffer.from("vault-data").toString("base64"),
      }),
    );
    mockDecryptString.mockReturnValue(
      JSON.stringify({ deepseek: "my-ds-key", anthropic: "claude-key" }),
    );

    expect(hasApiKey("deepseek")).toBe(true);
    expect(hasApiKey("openai")).toBe(false);
    expect(hasApiKey("anthropic")).toBe(true);

    const status = getAllKeyStatus();
    expect(status.deepseek).toBe(true);
    expect(status.openai).toBe(false);
    expect(status.anthropic).toBe(true);

    expect(isApiKeySet("deepseek")).toBe(true);
    expect(isApiKeySet("openai")).toBe(false);
    expect(isApiKeySet()).toBe(true);
  });
});

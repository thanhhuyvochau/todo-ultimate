import { describe, it, expect, beforeEach, vi } from "vitest";

const mockExistsSync = vi.fn<() => boolean>();
const mockReadFileSync = vi.fn<() => string>();
const mockWriteFileSync = vi.fn<() => void>();
const mockUnlinkSync = vi.fn<() => void>();
const mockIsEncryptionAvailable = vi.fn<() => boolean>();
const mockEncryptString = vi.fn<(value: string) => Buffer>();
const mockDecryptString = vi.fn<(buffer: Buffer) => string>();
const mockGetPath = vi.fn<(name: string) => string>();

vi.mock("fs", () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
  unlinkSync: (...args: unknown[]) => mockUnlinkSync(...args),
}));

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
  it("encrypts the key and writes it to disk", () => {
    mockIsEncryptionAvailable.mockReturnValue(true);
    mockEncryptString.mockReturnValue(Buffer.from("encrypted-data"));
    mockExistsSync.mockReturnValue(false);

    setApiKey("my-secret-key");

    expect(mockEncryptString).toHaveBeenCalledWith("my-secret-key");
    expect(mockWriteFileSync).toHaveBeenCalled();
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

  it("throws KEYCHAIN_WRITE_FAILED if file write fails", () => {
    mockIsEncryptionAvailable.mockReturnValue(true);
    mockEncryptString.mockReturnValue(Buffer.from("encrypted-data"));
    mockWriteFileSync.mockImplementation(() => {
      throw new Error("Disk full");
    });

    let thrown: { code?: string; message?: string } | null = null;
    try {
      setApiKey("key");
    } catch (err) {
      thrown = err as { code: string; message: string };
    }

    expect(thrown).not.toBeNull();
    expect(thrown!.code).toBe("KEYCHAIN_WRITE_FAILED");
  });
});

describe("getApiKey", () => {
  it("returns null when no key file exists", () => {
    mockIsEncryptionAvailable.mockReturnValue(true);
    mockExistsSync.mockReturnValue(false);

    expect(getApiKey()).toBeNull();
  });

  it("throws KEYCHAIN_UNAVAILABLE if encryption is not available", () => {
    mockIsEncryptionAvailable.mockReturnValue(false);

    let thrown: { code?: string; message?: string } | null = null;
    try {
      getApiKey();
    } catch (err) {
      thrown = err as { code: string; message: string };
    }

    expect(thrown).not.toBeNull();
    expect(thrown!.code).toBe("KEYCHAIN_UNAVAILABLE");
  });

  it("returns decrypted key when file exists and is valid", () => {
    mockIsEncryptionAvailable.mockReturnValue(true);
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        encryptedKey: Buffer.from("enc-data").toString("base64"),
      }),
    );
    mockDecryptString.mockReturnValue("my-decrypted-key");

    const result = getApiKey();

    expect(mockDecryptString).toHaveBeenCalled();
    expect(result).toBe("my-decrypted-key");
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

  it("returns null when decryptString fails", () => {
    mockIsEncryptionAvailable.mockReturnValue(true);
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ encryptedKey: "bad-base64" }),
    );
    mockDecryptString.mockImplementation(() => {
      throw new Error("Decryption failed");
    });

    const result = getApiKey();

    expect(result).toBeNull();
  });
});

describe("deleteApiKey", () => {
  it("removes the key file when it exists", () => {
    mockIsEncryptionAvailable.mockReturnValue(true);
    mockExistsSync.mockReturnValue(true);

    deleteApiKey();

    expect(mockUnlinkSync).toHaveBeenCalled();
  });

  it("does not fail when key file does not exist", () => {
    mockIsEncryptionAvailable.mockReturnValue(true);
    mockExistsSync.mockReturnValue(false);

    expect(() => deleteApiKey()).not.toThrow();
    expect(mockUnlinkSync).not.toHaveBeenCalled();
  });

  it("throws KEYCHAIN_UNAVAILABLE if encryption is not available", () => {
    mockIsEncryptionAvailable.mockReturnValue(false);

    let thrown: { code?: string; message?: string } | null = null;
    try {
      deleteApiKey();
    } catch (err) {
      thrown = err as { code: string; message: string };
    }

    expect(thrown).not.toBeNull();
    expect(thrown!.code).toBe("KEYCHAIN_UNAVAILABLE");
  });

  it("throws KEYCHAIN_WRITE_FAILED if unlink fails", () => {
    mockIsEncryptionAvailable.mockReturnValue(true);
    mockExistsSync.mockReturnValue(true);
    mockUnlinkSync.mockImplementation(() => {
      throw new Error("Permission denied");
    });

    let thrown: { code?: string; message?: string } | null = null;
    try {
      deleteApiKey();
    } catch (err) {
      thrown = err as { code: string; message: string };
    }

    expect(thrown).not.toBeNull();
    expect(thrown!.code).toBe("KEYCHAIN_WRITE_FAILED");
  });
});

describe("isApiKeySet", () => {
  it("returns true when key file exists", () => {
    mockExistsSync.mockReturnValue(true);
    expect(isApiKeySet()).toBe(true);
  });

  it("returns false when key file does not exist", () => {
    mockExistsSync.mockReturnValue(false);
    expect(isApiKeySet()).toBe(false);
  });
});

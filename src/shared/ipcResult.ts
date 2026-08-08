export interface IpcError {
  code: IpcErrorCode;
  message: string;
}

export type IpcErrorCode =
  | "DB_READ_FAILED"
  | "DB_WRITE_FAILED"
  | "VALIDATION_ERROR"
  | "STATE_TRANSITION_ILLEGAL"
  | "AI_TIMEOUT"
  | "KEYCHAIN_UNAVAILABLE"
  | "NOT_IMPLEMENTED"
  | "INTERNAL_ERROR"
  | "NOT_FOUND";

export type IpcResult<T> =
  { ok: true; data: T } | { ok: false; error: IpcError };

export function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(
  code: IpcErrorCode,
  message: string,
): IpcResult<T> {
  return { ok: false, error: { code, message } };
}

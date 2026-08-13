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
  | "AI_RATE_LIMITED"
  | "AI_AUTH_FAILED"
  | "AI_PARSE_ERROR"
  | "AI_NETWORK_ERROR"
  | "AI_REQUEST_FAILED"
  | "KEYCHAIN_UNAVAILABLE"
  | "KEYCHAIN_WRITE_FAILED"
  | "NOT_IMPLEMENTED"
  | "INTERNAL_ERROR"
  | "NOT_FOUND"
  | "TASK_ALREADY_ACTIVE"
  | "TIMER_START_FAILED"
  | "TIMER_PAUSE_FAILED"
  | "TIMER_READ_FAILED";

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

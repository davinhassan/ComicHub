export type ProviderErrorCode =
  | "RATE_LIMITED"
  | "UPSTREAM_TIMEOUT"
  | "NOT_FOUND"
  | "UNAVAILABLE"
  | "FORBIDDEN"
  | "INVALID_RESPONSE"
  | "NO_LICENSE"
  | "INVALID_INPUT";

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly retryAfterMs?: number;

  constructor(code: ProviderErrorCode, retryAfterMs?: number) {
    super(code);
    this.code = code;
    this.retryAfterMs = retryAfterMs;
    this.name = "ProviderError";
  }
}

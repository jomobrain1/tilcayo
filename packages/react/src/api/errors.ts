function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : undefined;
}

export class TilcayoApiError extends Error {
  readonly statusCode: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly response: unknown;

  constructor(statusCode: number, response: unknown, statusText = "") {
    const payload = record(response);
    const error = record(payload?.error) ?? payload;
    const message = typeof error?.message === "string" ? error.message
      : typeof response === "string" && response.trim() ? response
      : statusText || `HTTP ${statusCode}`;
    super(message);
    this.name = "TilcayoApiError";
    this.statusCode = statusCode;
    this.code = typeof error?.code === "string" ? error.code : undefined;
    this.details = error?.details;
    this.response = response;
  }
}

export class TilcayoNetworkError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : "Network request failed", { cause });
    this.name = "TilcayoNetworkError";
  }
}

export function isTilcayoApiError(error: unknown): error is TilcayoApiError {
  return error instanceof TilcayoApiError;
}

export function isTilcayoNetworkError(error: unknown): error is TilcayoNetworkError {
  return error instanceof TilcayoNetworkError;
}

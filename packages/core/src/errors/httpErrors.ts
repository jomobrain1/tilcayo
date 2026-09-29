import type { TilcayoHttpError } from "./types.js";

export function createHttpError(
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): TilcayoHttpError {
  return Object.assign(new Error(message), { statusCode, code, details });
}

export function isTilcayoHttpError(error: unknown): error is TilcayoHttpError {
  return error instanceof Error
    && "statusCode" in error
    && typeof error.statusCode === "number"
    && Number.isInteger(error.statusCode)
    && error.statusCode >= 400
    && error.statusCode <= 599
    && "code" in error
    && typeof error.code === "string";
}

export function badRequest(message = "Bad request", details?: unknown): TilcayoHttpError {
  return createHttpError(400, "BAD_REQUEST", message, details);
}

export const unauthorized = (message = "Unauthorized"): TilcayoHttpError => createHttpError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "Forbidden"): TilcayoHttpError => createHttpError(403, "FORBIDDEN", message);
export const conflict = (message = "Conflict"): TilcayoHttpError => createHttpError(409, "CONFLICT", message);

export function notFound(message = "Resource not found", details?: unknown): TilcayoHttpError {
  return createHttpError(404, "NOT_FOUND", message, details);
}

export function validationError(details?: unknown): TilcayoHttpError {
  return createHttpError(422, "VALIDATION_ERROR", "Request validation failed", details);
}

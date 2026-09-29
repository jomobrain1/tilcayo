import { badRequest } from "../errors/httpErrors.js";

// Shared pagination shape for database adapters.
export interface PaginationOptions {
  page?: number | string;
  perPage?: number | string;
}

export interface Page<T> {
  items: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    lastPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function positiveInteger(value: unknown, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) {
    throw badRequest(`${name} must be a positive integer`);
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw badRequest(`${name} must be a positive integer`);
  return number;
}

// Accept HTTP query values without exposing raw queries to the database.
export function paginationParams(query: Record<string, unknown>): { page: number; perPage: number } {
  const page = positiveInteger(query.page, 1, "page");
  const perPage = Math.min(positiveInteger(query.perPage, 20, "perPage"), 100);
  if (!Number.isSafeInteger((page - 1) * perPage)) throw badRequest("page is too large");
  return { page, perPage };
}

import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import { createApiClient } from "../api/createApiClient.js";
import { isTilcayoApiError, isTilcayoNetworkError } from "../api/errors.js";
import type { ApiClient, ApiClientConfig, ApiRequest } from "../api/types.js";

export interface TilcayoQueryArgs extends ApiRequest { url: string }
export interface TilcayoQueryError {
  kind: "http" | "network" | "abort" | "client";
  message: string;
  statusCode?: number;
  code?: string;
  details?: unknown;
}
export type TilcayoBaseQuery = BaseQueryFn<string | TilcayoQueryArgs, unknown, TilcayoQueryError>;

export function toQueryError(error: unknown): TilcayoQueryError {
  if (isTilcayoApiError(error)) return {
    kind: "http", message: error.message, statusCode: error.statusCode,
    ...(error.code ? { code: error.code } : {}),
    ...(error.details !== undefined ? { details: error.details } : {}),
  };
  return {
    kind: isTilcayoNetworkError(error) ? "network" : error instanceof Error && error.name === "AbortError" ? "abort" : "client",
    message: error instanceof Error ? error.message : "Request failed",
  };
}

export function createTilcayoBaseQuery(config: ApiClientConfig | { client: ApiClient } = {}): TilcayoBaseQuery {
  const client = "client" in config ? config.client : createApiClient(config);
  return async (args, context) => {
    const { url, ...options } = typeof args === "string" ? { url: args } : args;
    try {
      const data = await client.request(url, { ...options, signal: context.signal });
      // RTK Query requires a defined data value, including for HTTP 204.
      return { data: data === undefined ? null : data };
    } catch (error) { return { error: toQueryError(error) }; }
  };
}

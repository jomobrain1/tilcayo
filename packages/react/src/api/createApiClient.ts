import { TilcayoApiError, TilcayoNetworkError } from "./errors.js";
import type { ApiClient, ApiClientConfig, ApiRequest } from "./types.js";
import { buildUrl } from "./url.js";

function nativeBody(value: unknown): value is BodyInit {
  return typeof value === "string"
    || (typeof FormData !== "undefined" && value instanceof FormData)
    || (typeof Blob !== "undefined" && value instanceof Blob)
    || value instanceof URLSearchParams
    || value instanceof ArrayBuffer
    || ArrayBuffer.isView(value)
    || (typeof ReadableStream !== "undefined" && value instanceof ReadableStream);
}

function rethrowTransport(error: unknown, signal?: AbortSignal | null): never {
  if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
  throw new TilcayoNetworkError(error);
}

export function createApiClient(config: ApiClientConfig = {}): ApiClient {
  async function request<T = unknown>(path: string, options: ApiRequest = {}): Promise<T> {
    const { query, body, headers: overrides, method = "GET", ...init } = options;
    const verb = method.toUpperCase();
    if ((verb === "GET" || verb === "HEAD") && body !== undefined) {
      throw new TypeError(`${verb} requests cannot have a body`);
    }
    const url = buildUrl(config.baseUrl ?? "", path, query);
    const json = body !== undefined && !nativeBody(body);
    const encoded = body === undefined ? undefined : json ? JSON.stringify(body) : body as BodyInit;
    const headers = new Headers({ Accept: "application/json" });
    if (json) headers.set("Content-Type", "application/json");
    const clientHeaders = typeof config.headers === "function" ? await config.headers() : config.headers;
    for (const source of [clientHeaders, overrides]) {
      new Headers(source).forEach((value, key) => headers.set(key, value));
    }
    const fetcher = config.fetch ?? globalThis.fetch;
    if (!fetcher) throw new TypeError("A fetch implementation is required");
    let response: Response;
    try {
      response = await fetcher.call(globalThis, url, {
        ...init, method: verb, headers, body: encoded,
        credentials: init.credentials ?? config.credentials,
      });
    } catch (error) {
      rethrowTransport(error, init.signal);
    }
    let parsed: unknown;
    if (response.status !== 204 && response.status !== 205 && verb !== "HEAD") {
      let text: string;
      try { text = await response.text(); }
      catch (error) { rethrowTransport(error, init.signal); }
      if (text) {
        const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
        if (contentType === "application/json" || contentType.endsWith("+json")) {
          try { parsed = JSON.parse(text); }
          catch (error) {
            if (response.ok) throw error;
            parsed = text;
          }
        } else parsed = text;
      }
    }
    if (!response.ok) throw new TilcayoApiError(response.status, parsed, response.statusText);
    return parsed as T;
  }

  return {
    request,
    get: (path, options) => request(path, { ...options, method: "GET" }),
    post: (path, body, options) => request(path, { ...options, method: "POST", body }),
    put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
    patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
    delete: (path, options) => request(path, { ...options, method: "DELETE" }),
  };
}

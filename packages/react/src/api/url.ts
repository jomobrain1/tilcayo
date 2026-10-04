import type { ApiQuery } from "./types.js";

export function buildUrl(base: string, path: string, query?: ApiQuery): string {
  if (/[?#]/.test(base)) throw new TypeError("baseUrl must not contain a query or fragment");
  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith("//")) {
    throw new TypeError("Request paths must be relative; configure the origin in baseUrl");
  }
  const joined = base ? `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}` : path;
  const hashIndex = joined.indexOf("#");
  const hash = hashIndex < 0 ? "" : joined.slice(hashIndex);
  const url = hashIndex < 0 ? joined : joined.slice(0, hashIndex);
  const queryIndex = url.indexOf("?");
  const pathname = queryIndex < 0 ? url : url.slice(0, queryIndex);
  const params = new URLSearchParams(queryIndex < 0 ? "" : url.slice(queryIndex + 1));
  for (const [key, value] of Object.entries(query ?? {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined && item !== null) params.append(key, String(item));
    }
  }
  const search = params.toString();
  return `${pathname}${search ? `?${search}` : ""}${hash}`;
}

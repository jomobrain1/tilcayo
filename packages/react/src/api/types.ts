export type ApiQueryValue = string | number | boolean | null | undefined;
export type ApiQuery = Readonly<Record<string, ApiQueryValue | readonly ApiQueryValue[]>>;

export interface ApiClientConfig {
  baseUrl?: string;
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  credentials?: RequestCredentials;
  fetch?: typeof globalThis.fetch;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body" | "method"> {
  query?: ApiQuery;
}

export interface ApiRequest extends ApiRequestOptions {
  method?: string;
  /** JSON-serializable data or a native fetch body. */
  body?: unknown;
}

export interface TilcayoResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiClient {
  request<T = unknown>(path: string, options?: ApiRequest): Promise<T>;
  get<T = unknown>(path: string, options?: ApiRequestOptions): Promise<T>;
  post<T = unknown>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T>;
  put<T = unknown>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T>;
  patch<T = unknown>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T>;
  delete<T = unknown>(path: string, options?: ApiRequestOptions): Promise<T>;
}

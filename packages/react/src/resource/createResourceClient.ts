import type { ApiClient, ApiRequestOptions, TilcayoResponse } from "../api/types.js";

export interface ResourceClientConfig {
  api: ApiClient;
  path: string;
}

export interface ResourceClient<T, CreateInput, UpdateInput> {
  all(options?: ApiRequestOptions): Promise<TilcayoResponse<T[]>>;
  find(id: string | number, options?: ApiRequestOptions): Promise<TilcayoResponse<T>>;
  create(data: CreateInput, options?: ApiRequestOptions): Promise<TilcayoResponse<T>>;
  update(id: string | number, data: UpdateInput, options?: ApiRequestOptions): Promise<TilcayoResponse<T>>;
  delete(id: string | number, options?: ApiRequestOptions): Promise<void>;
}

export function createResourceClient<T, CreateInput = Partial<T>, UpdateInput = Partial<CreateInput>>(
  { api, path }: ResourceClientConfig,
): ResourceClient<T, CreateInput, UpdateInput> {
  const collection = path.replace(/\/+$/, "");
  if (!collection || /[?#]/.test(collection)) throw new TypeError("Resource path must be a nonempty collection path without query or fragment");
  function item(id: string | number): string {
    const value = String(id);
    if (!value.trim() || value === "." || value === ".." || (typeof id === "number" && !Number.isFinite(id))) {
      throw new TypeError("Resource ID must be a nonempty string or finite number");
    }
    return `${collection}/${encodeURIComponent(value)}`;
  }
  return {
    all: (options) => api.get(collection, options),
    find: (id, options) => api.get(item(id), options),
    create: (data, options) => api.post(collection, data, options),
    update: (id, data, options) => api.put(item(id), data, options),
    delete: (id, options) => api.delete(item(id), options),
  };
}

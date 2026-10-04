import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiClientConfig } from "../api/types.js";
import { createTilcayoBaseQuery, type TilcayoBaseQuery } from "./baseQuery.js";

export interface TilcayoApiConfig extends ApiClientConfig {
  baseQuery?: TilcayoBaseQuery;
  tagTypes?: string[];
}

/** Create once per application/store; inject resource endpoints into this API. */
export function createTilcayoApi({ baseQuery, tagTypes = [], ...config }: TilcayoApiConfig = {}) {
  return createApi({
    reducerPath: "tilcayoApi",
    baseQuery: baseQuery ?? createTilcayoBaseQuery(config),
    tagTypes,
    endpoints: () => ({}),
  });
}
export type TilcayoApi = ReturnType<typeof createTilcayoApi>;

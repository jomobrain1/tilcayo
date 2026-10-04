import { configureStore, type ReducersMapObject } from "@reduxjs/toolkit";
import type { TilcayoApi } from "./createTilcayoApi.js";

export function createTilcayoStore<S extends Record<string, unknown> = Record<never, never>>(
  { api, reducers, devTools = true }: {
    api: Pick<TilcayoApi, "reducerPath" | "reducer" | "middleware">;
    reducers?: ReducersMapObject<S>;
    devTools?: boolean;
  },
) {
  if (reducers && api.reducerPath in reducers) throw new TypeError("The tilcayoApi reducer key is reserved");
  type State = S & { tilcayoApi: ReturnType<TilcayoApi["reducer"]> };
  const reducer = { ...reducers, [api.reducerPath]: api.reducer } as ReducersMapObject<State>;
  return configureStore({
    reducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
    devTools,
  });
}

export { createApp } from "./app.js";

export { createContext } from "./context/createContext.js";

export type {
  TilcayoContext,
  TilcayoParam,
  TilcayoResponse,
} from "./context/types.js";

export { createRouter } from "./routing/createRouter.js";

export { defineRoutes } from "./routing/defineRoutes.js";

export type { Router, RouteRegistrar } from "./routing/defineRoutes.js";

export type {
  HttpMethod,
  RouteDefinition,
  RouteHandler,
} from "./routing/types.js";

export const tilcayoVersion = "0.0.1";

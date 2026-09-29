import type { createRouter } from "./createRouter.js";

export type Router = ReturnType<typeof createRouter>;

export type RouteRegistrar = (route: Router) => void;

export function defineRoutes(registrar: RouteRegistrar): RouteRegistrar {
  return registrar;
}

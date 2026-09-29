import type { TilcayoContext } from "../context/types.js";
import type { RouteValidation } from "../validation/types.js";

export interface RouteOptions {
  validate?: RouteValidation;
}

export interface ResourceRouteOptions {
  index?: RouteOptions;
  store?: RouteOptions;
  show?: RouteOptions;
  update?: RouteOptions;
  destroy?: RouteOptions;
}

export type ResourceController = Record<keyof ResourceRouteOptions, RouteHandler>;

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE";

export type RouteHandler =
  (ctx: TilcayoContext) => unknown | Promise<unknown>;

export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
  options: RouteOptions;
}

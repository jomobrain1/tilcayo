import type { TilcayoContext } from "../context/types.js";
import type { RouteValidation } from "../validation/types.js";
import type { Middleware } from "../middleware/types.js";

export interface RouteOptions<Body = unknown> {
  middleware?: Middleware[];
  validate?: RouteValidation<Body>;
}

export interface ResourceRouteOptions<CreateBody = unknown, UpdateBody = unknown> {
  middleware?: Middleware[];
  index?: RouteOptions;
  store?: RouteOptions<CreateBody>;
  show?: RouteOptions;
  update?: RouteOptions<UpdateBody>;
  destroy?: RouteOptions;
}

export interface ResourceController<CreateBody = unknown, UpdateBody = unknown> {
  index: RouteHandler;
  store: RouteHandler<CreateBody>;
  show: RouteHandler;
  update: RouteHandler<UpdateBody>;
  destroy: RouteHandler;
}

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE";

export type RouteHandler<Body = unknown> =
  (ctx: TilcayoContext<Body>) => unknown | Promise<unknown>;

export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
  options: RouteOptions;
}

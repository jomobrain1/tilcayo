import type { TilcayoContext } from "../context/types.js";

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
}

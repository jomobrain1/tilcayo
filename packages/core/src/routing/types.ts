export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE";

export type RouteHandler =
  () => unknown | Promise<unknown>;

export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
}
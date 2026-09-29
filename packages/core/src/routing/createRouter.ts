import type { HttpMethod, RouteDefinition, RouteHandler, RouteOptions, ResourceController, ResourceRouteOptions } from "./types.js";
import type { TilcayoContext } from "../context/types.js";

export function createRouter() {
  const routes: RouteDefinition[] = [];
  let prefix = "";

  function joinPath(base: string, path: string): string {
    return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  }

  function register<Body>(method: HttpMethod, path: string, handler: RouteHandler<Body>, options: RouteOptions<Body> = {}) {
    routes.push({
      method,
      path: prefix ? joinPath(prefix, path) : path,
      // The app validates the request before invoking this stored handler.
      handler: (ctx) => handler(ctx as TilcayoContext<Body>),
      options,
    });

    return api;
  }

  function get<Body = unknown>(path: string, handler: RouteHandler<Body>, options?: RouteOptions<NoInfer<Body>>) {
    return register("GET", path, handler, options);
  }

  function post<Body = unknown>(path: string, handler: RouteHandler<Body>, options?: RouteOptions<NoInfer<Body>>) {
    return register("POST", path, handler, options);
  }

  function put<Body = unknown>(path: string, handler: RouteHandler<Body>, options?: RouteOptions<NoInfer<Body>>) {
    return register("PUT", path, handler, options);
  }

  function patch<Body = unknown>(path: string, handler: RouteHandler<Body>, options?: RouteOptions<NoInfer<Body>>) {
    return register("PATCH", path, handler, options);
  }

  function remove<Body = unknown>(path: string, handler: RouteHandler<Body>, options?: RouteOptions<NoInfer<Body>>) {
    return register("DELETE", path, handler, options);
  }

  function all(): readonly RouteDefinition[] {
    return routes;
  }

  function group(options: { prefix: string }, callback: () => void) {
    const previousPrefix = prefix;
    prefix = joinPath(prefix, options.prefix);
    try {
      callback();
    } finally {
      prefix = previousPrefix;
    }
    return api;
  }

  function resource<CreateBody = unknown, UpdateBody = unknown>(
    path: string,
    controller: ResourceController<CreateBody, UpdateBody>,
    options: ResourceRouteOptions<NoInfer<CreateBody>, NoInfer<UpdateBody>> = {},
  ) {
    get(path, controller.index, options.index);
    post(path, controller.store, options.store);
    const itemPath = joinPath(path, ":id");
    get(itemPath, controller.show, options.show);
    put(itemPath, controller.update, options.update);
    remove(itemPath, controller.destroy, options.destroy);
    return api;
  }

  const api = {
    get,
    post,
    put,
    patch,
    delete: remove,
    group,
    resource,
    all,
  };

  return api;
}

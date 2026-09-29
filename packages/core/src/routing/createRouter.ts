import type { HttpMethod, RouteDefinition, RouteHandler, RouteOptions, ResourceController, ResourceRouteOptions } from "./types.js";

export function createRouter() {
  const routes: RouteDefinition[] = [];
  let prefix = "";

  function joinPath(base: string, path: string): string {
    return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  }

  function register(method: HttpMethod, path: string, handler: RouteHandler, options: RouteOptions = {}) {
    routes.push({
      method,
      path: prefix ? joinPath(prefix, path) : path,
      handler,
      options,
    });

    return api;
  }

  function get(path: string, handler: RouteHandler, options?: RouteOptions) {
    return register("GET", path, handler, options);
  }

  function post(path: string, handler: RouteHandler, options?: RouteOptions) {
    return register("POST", path, handler, options);
  }

  function put(path: string, handler: RouteHandler, options?: RouteOptions) {
    return register("PUT", path, handler, options);
  }

  function patch(path: string, handler: RouteHandler, options?: RouteOptions) {
    return register("PATCH", path, handler, options);
  }

  function remove(path: string, handler: RouteHandler, options?: RouteOptions) {
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

  function resource(
    path: string,
    controller: ResourceController,
    options: ResourceRouteOptions = {},
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

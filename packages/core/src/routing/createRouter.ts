import type { HttpMethod, RouteDefinition, RouteHandler } from "./types.js";

export function createRouter() {
  const routes: RouteDefinition[] = [];
  let prefix = "";

  function joinPath(base: string, path: string): string {
    return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  }

  function register(method: HttpMethod, path: string, handler: RouteHandler) {
    routes.push({
      method,
      path: prefix ? joinPath(prefix, path) : path,
      handler,
    });

    return api;
  }

  function get(path: string, handler: RouteHandler) {
    return register("GET", path, handler);
  }

  function post(path: string, handler: RouteHandler) {
    return register("POST", path, handler);
  }

  function put(path: string, handler: RouteHandler) {
    return register("PUT", path, handler);
  }

  function patch(path: string, handler: RouteHandler) {
    return register("PATCH", path, handler);
  }

  function remove(path: string, handler: RouteHandler) {
    return register("DELETE", path, handler);
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
    controller: Record<"index" | "store" | "show" | "update" | "destroy", RouteHandler>,
  ) {
    get(path, controller.index);
    post(path, controller.store);
    const itemPath = joinPath(path, ":id");
    get(itemPath, controller.show);
    put(itemPath, controller.update);
    remove(itemPath, controller.destroy);
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

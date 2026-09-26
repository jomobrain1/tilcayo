import type { HttpMethod, RouteDefinition, RouteHandler } from "./types.js";

export function createRouter() {
  const routes: RouteDefinition[] = [];

  function register(method: HttpMethod, path: string, handler: RouteHandler) {
    routes.push({
      method,
      path,
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

  const api = {
    get,
    post,
    put,
    patch,
    delete: remove,
    all,
  };

  return api;
}

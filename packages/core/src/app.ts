import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import type { Server } from "node:http";

import { createRouter } from "./routing/createRouter.js";

import type { RouteDefinition } from "./routing/types.js";

export function createApp() {
  const http: Express = express();

  const route = createRouter();

  let routesMounted = false;

  function mountRoute(definition: RouteDefinition): void {
    const handler = async (
      _req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await definition.handler();

        if (result === undefined) {
          res.status(204).end();
          return;
        }

        res.json(result);
      } catch (error) {
        next(error);
      }
    };

    switch (definition.method) {
      case "GET":
        http.get(definition.path, handler);
        break;

      case "POST":
        http.post(definition.path, handler);
        break;

      case "PUT":
        http.put(definition.path, handler);
        break;

      case "PATCH":
        http.patch(definition.path, handler);
        break;

      case "DELETE":
        http.delete(definition.path, handler);
        break;
    }
  }

  function mountRoutes(): void {
    if (routesMounted) {
      return;
    }

    for (const definition of route.all()) {
      mountRoute(definition);
    }

    routesMounted = true;
  }

  function listen(port = Number(process.env.PORT ?? 9149)): Server {
    mountRoutes();

    return http.listen(port, () => {
      console.log(`Tilcayo running at http://localhost:${port}`);
    });
  }

  return {
    route,
    listen,
  };
}

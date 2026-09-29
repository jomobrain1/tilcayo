import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import type { Server } from "node:http";

import { createRouter } from "./routing/createRouter.js";
import { createContext } from "./context/createContext.js";
import { validateContext } from "./validation/validateContext.js";
import { handleNotFound, handleError } from "./errors/errorHandler.js";

import type { RouteDefinition } from "./routing/types.js";
import type { Router, RouteRegistrar } from "./routing/defineRoutes.js";
import { runMiddleware, type Middleware, type MiddlewareContext } from "./middleware/types.js";
import { createHttpError } from "./errors/httpErrors.js";

export interface AppOptions {
  middleware?: Middleware[];
  bodyLimit?: number;
}

interface TilcayoApp {
  route: Router;
  routes(registrar: RouteRegistrar): TilcayoApp;
  listen(port?: number): Server;
}

export function createApp(options: AppOptions = {}): TilcayoApp {
  const http: Express = express();
  http.disable("x-powered-by");
  const limit = options.bodyLimit ?? 102400;
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("bodyLimit must be a positive integer");
  const globalMiddleware = [...(options.middleware ?? [])];

  const route = createRouter();

  let routesMounted = false;

  function mountRoute(definition: RouteDefinition): void {
    const handler = async (
      req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      try {
        const rawContext: MiddlewareContext = {
          ...createContext(req, res),
          bodyLimit: limit,
          status: (code) => { res.status(code); },
          header: (name, value) => { res.setHeader(name, value); },
          vary: (name) => { res.vary(name); },
          onFinish: (callback) => { res.once("finish", () => callback(res.statusCode)); },
        };
        const result = await runMiddleware(rawContext, [...globalMiddleware, ...(definition.options.middleware ?? [])], async () => {
          if (req.method === "OPTIONS") throw createHttpError(404, "NOT_FOUND", "Route not found");
          await new Promise<void>((resolve, reject) => {
            express.json({ limit: rawContext.bodyLimit })(req, res, (error?: unknown) => error ? reject(error) : resolve());
          });
          rawContext.body = req.body;
          const ctx = await validateContext(rawContext, definition.options.validate);
          return definition.handler(ctx);
        });

        if (res.statusCode >= 400 || res.hasHeader("Set-Cookie")) res.setHeader("Cache-Control", "no-store");

        if (result === undefined) {
          res.status(204).end();
          return;
        }

        res.json(result);
      } catch (error) {
        next(error);
      }
    };

    // Dispatch preflights to the requested method's middleware, without its controller.
    http.options(definition.path, (req, res, next) => {
      if (req.get("Access-Control-Request-Method") !== definition.method) { next(); return; }
      void handler(req, res, next);
    });

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

    http.use(handleNotFound);
    http.use(handleError);
    routesMounted = true;
  }

  function listen(port = Number(process.env.PORT ?? 9149)): Server {
    mountRoutes();

    return http.listen(port, () => {
      console.log(`Tilcayo running at http://localhost:${port}`);
    });
  }

  function routes(registrar: RouteRegistrar) {
    registrar(route);
    return api;
  }

  const api = {
    route,
    routes,
    listen,
  };

  return api;
}

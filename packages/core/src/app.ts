import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import type { Server } from "node:http";

export type TilcayoHandler = () => unknown | Promise<unknown>;

export function createApp() {
  const http: Express = express();

  function get(path: string, handler: TilcayoHandler) {
    http.get(path, async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await handler();

        if (result === undefined) {
          res.status(204).end();
          return;
        }

        res.json(result);
      } catch (error) {
        next(error);
      }
    });

    return api;
  }

  function listen(port = Number(process.env.PORT ?? 9149)): Server {
    return http.listen(port, () => {
      console.log(`Tilcayo running at http://localhost:${port}`);
    });
  }

  const api = {
    get,
    listen,
  };

  return api;
}

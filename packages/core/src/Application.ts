import express, { type Express } from "express";
import type { Server } from "node:http";

export type TilcayoHandler = () => unknown | Promise<unknown>;

export class Application {
  private readonly http: Express;

  constructor() {
    this.http = express();
  }

  get(path: string, handler: TilcayoHandler): this {
    this.http.get(path, async (_req, res, next) => {
      try {
        const result = await handler();

        res.json(result);
      } catch (error) {
        next(error);
      }
    });

    return this;
  }

  listen(port: number = 9149): Server {
    return this.http.listen(port, () => {
      console.log(`Tilcayo running at http://localhost:${port}`);
    });
  }
}
import type {
  Request,
  Response,
} from "express";

import type {
  TilcayoContext,
} from "./types.js";

export function createContext(
  req: Request,
  res: Response
): TilcayoContext {
  return {
    params: req.params,
    query: req.query,
    body: req.body,
    headers: req.headers,
    method: req.method,
    path: req.path,
    ip: req.ip,
    response: {
      success(data, message = "Success") {
        return { success: true, message, data };
      },
      created(data, message = "Created successfully") {
        res.status(201);
        return { success: true, message, data };
      },
      noContent() {
        res.status(204);
        return undefined;
      },
    },
  };
}

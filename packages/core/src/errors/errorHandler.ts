import type { NextFunction, Request, Response } from "express";
import { createHttpError, isTilcayoHttpError, notFound } from "./httpErrors.js";

export function handleNotFound(_req: Request, _res: Response, next: NextFunction): void {
  next(notFound("Route not found"));
}

export function handleError(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  if (error instanceof Error && "type" in error) {
    if (error.type === "entity.too.large") error = createHttpError(413, "BODY_TOO_LARGE", "Request body is too large");
    else if (error.type === "entity.parse.failed") error = createHttpError(400, "BAD_REQUEST", "Invalid JSON body");
  }

  if (isTilcayoHttpError(error)) {
    res.status(error.statusCode).json({
      success: false,
      statusCode: error.statusCode,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    success: false,
    statusCode: 500,
    error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" },
  });
}

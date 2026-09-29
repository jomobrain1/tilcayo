import type { NextFunction, Request, Response } from "express";
import { isTilcayoHttpError, notFound } from "./httpErrors.js";

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

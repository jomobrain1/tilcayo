export { createApp } from "./app.js";
export type { AppOptions } from "./app.js";
export type { Middleware, MiddlewareContext } from "./middleware/types.js";
export { rateLimit, cors, requestId, requestLogger, securityHeaders, bodyLimit, cache } from "./middleware/builtins.js";
export type { RequestLog } from "./middleware/builtins.js";

export { connectMongo, disconnectMongo, getMongoState } from "./database/mongo.js";
export type { MongoConnectOptions, MongoState } from "./database/types.js";
export { mongoModel } from "./database/mongoModel.js";
export type { MongoReadOptions, MongoPaginationOptions, MongoCursorOptions } from "./database/mongoModel.js";
export { paginationParams } from "./database/pagination.js";
export type { Page, PaginationOptions } from "./database/pagination.js";

export { createContext } from "./context/createContext.js";

export type {
  TilcayoContext,
  TilcayoParam,
  TilcayoResponse,
} from "./context/types.js";

export { createRouter } from "./routing/createRouter.js";

export { defineRoutes } from "./routing/defineRoutes.js";

export type { Router, RouteRegistrar } from "./routing/defineRoutes.js";

export type {
  HttpMethod,
  RouteDefinition,
  RouteHandler,
  RouteOptions,
  ResourceRouteOptions,
  ResourceController,
} from "./routing/types.js";

export { createHttpError, isTilcayoHttpError, badRequest, notFound, validationError } from "./errors/httpErrors.js";
export type { TilcayoHttpError } from "./errors/types.js";
export { validateContext } from "./validation/validateContext.js";
export type { RouteValidation, ValidationDetails, ValidationIssue } from "./validation/types.js";

export const tilcayoVersion = "0.0.1";

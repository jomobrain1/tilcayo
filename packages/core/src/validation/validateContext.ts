import * as z from "zod/v4/core";
import type { TilcayoContext } from "../context/types.js";
import { validationError } from "../errors/httpErrors.js";
import type { RouteValidation, ValidationDetails } from "./types.js";

export async function validateContext(
  ctx: TilcayoContext,
  validation?: RouteValidation,
): Promise<TilcayoContext> {
  if (!validation) return ctx;

  const parsed: Record<keyof RouteValidation, unknown> = {
    body: ctx.body, query: ctx.query, params: ctx.params,
  };
  const details: ValidationDetails = {};
  for (const location of ["body", "query", "params"] as const) {
    const schema = validation[location];
    if (!schema) continue;
    const result = await z.safeParseAsync(schema, ctx[location]);
    if (result.success) {
      parsed[location] = result.data;
    } else {
      details[location] = result.error.issues.map((issue) => ({
        path: issue.path.map(String),
        message: issue.message,
        code: issue.code,
      }));
    }
  }

  if (Object.keys(details).length > 0) throw validationError(details);

  // M3 context types remain stable; schema-to-context inference is a later milestone.
  return {
    ...ctx,
    body: parsed.body,
    query: parsed.query as TilcayoContext["query"],
    params: parsed.params as TilcayoContext["params"],
  };
}

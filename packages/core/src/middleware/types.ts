import type { TilcayoContext } from "../context/types.js";

export interface MiddlewareContext extends TilcayoContext {
  requestId?: string;
  bodyLimit: number;
  status(code: number): void;
  header(name: string, value: string): void;
  vary(name: string): void;
  onFinish(callback: (status: number) => void): void;
}

export type Middleware = (ctx: MiddlewareContext, next: () => Promise<unknown>) => unknown | Promise<unknown>;

export async function runMiddleware(ctx: MiddlewareContext, middleware: readonly Middleware[], handler: () => Promise<unknown>): Promise<unknown> {
  let last = -1;
  async function dispatch(index: number): Promise<unknown> {
    if (index <= last) throw new Error("Middleware next() called more than once");
    last = index;
    return index === middleware.length ? handler() : middleware[index](ctx, () => dispatch(index + 1));
  }
  return dispatch(0);
}

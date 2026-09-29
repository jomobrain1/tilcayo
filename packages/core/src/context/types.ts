export type TilcayoParam =
  | string
  | string[];

export interface TilcayoResponse {
  success(data?: unknown, message?: string): unknown;
  created(data?: unknown, message?: string): unknown;
  noContent(): undefined;
}

export interface TilcayoContext {
  params: Record<
    string,
    TilcayoParam
  >;

  query: Record<string, unknown>;

  body: unknown;

  headers: Record<
    string,
    string | string[] | undefined
  >;

  method: string;
  path: string;
  ip?: string;
  response: TilcayoResponse;
}

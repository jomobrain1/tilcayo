export interface TilcayoHttpError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;
}

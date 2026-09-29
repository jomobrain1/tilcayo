import type * as z from "zod/v4/core";

export interface RouteValidation {
  body?: z.$ZodType;
  query?: z.$ZodType;
  params?: z.$ZodType;
}

export interface ValidationIssue {
  path: string[];
  message: string;
  code: string;
}

export interface ValidationDetails {
  body?: ValidationIssue[];
  query?: ValidationIssue[];
  params?: ValidationIssue[];
}

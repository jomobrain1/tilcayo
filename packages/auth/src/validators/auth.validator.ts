import { z } from "zod";

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8).max(72).refine((value) => Buffer.byteLength(value) <= 72, "Password must be at most 72 UTF-8 bytes");
export const registerSchema = z.object({ name: z.string().trim().min(2).max(100), email, password });
export const loginSchema = z.object({ email, password });
export const refreshSchema = z.object({ refreshToken: z.string().min(1).max(8192) });
export const logoutSchema = refreshSchema;
export const forgotPasswordSchema = z.object({ email });
export const verifyResetCodeSchema = z.object({ email, code: z.string().regex(/^\d{6}$/) });
export const resetPasswordSchema = z.object({ resetToken: z.string().regex(/^[a-f0-9]{64}$/), password });

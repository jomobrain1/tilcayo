export { createAuth } from "./createAuth.js";
export { createSmtpPasswordResetSender } from "./mail.js";
export type { SmtpPasswordResetConfig } from "./mail.js";
export { hashPassword, verifyPassword } from "./password.js";
export { registerSchema, loginSchema, refreshSchema, logoutSchema, forgotPasswordSchema, verifyResetCodeSchema, resetPasswordSchema } from "./validators/auth.validator.js";
export type { AuthConfig, AuthUser, AuthTokenPayload, AuthenticatedContext, AuthenticatedRouteHandler } from "./types.js";

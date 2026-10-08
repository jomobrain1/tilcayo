// Reuse the default validation, including email normalization and password limits.
// You can import and extend these schemas here when your application needs more fields.
export { registerSchema, loginSchema, refreshSchema, logoutSchema, forgotPasswordSchema, verifyResetCodeSchema, resetPasswordSchema } from "@tilcayo/auth";

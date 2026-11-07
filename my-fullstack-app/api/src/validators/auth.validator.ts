// Reuse the default validation, including email normalization and password limits.
// You can import and extend these schemas here when your application needs more fields.
import { auth } from "../auth.js";
export { registerSchema, profileSchema, loginSchema, forgotPasswordSchema, verifyResetCodeSchema, resetPasswordSchema } from "@tilcayo/auth";
export const refreshSchema = auth.schemas.refresh;
export const logoutSchema = auth.schemas.logout;

import type { ApiClientConfig } from "../api/types.js";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
}
export interface AuthTokens { tokenType: "Bearer"; accessToken: string; refreshToken: string }
export interface LoginInput { email: string; password: string }
export interface RegisterInput extends LoginInput { name: string }
export interface AuthState { user: AuthUser | null; isAuthenticated: boolean; initialized: boolean }
export interface FrontendAuthConfig extends ApiClientConfig {
  /** Relative to baseUrl. Defaults to /auth with baseUrl /api. */
  authPath?: string;
  tagTypes?: string[];
  /** Optional in-memory bootstrap credentials; never persisted by this package. */
  initialTokens?: AuthTokens;
}

export interface ForgotPasswordInput { email: string }
export interface VerifyResetCodeInput extends ForgotPasswordInput { code: string }
export interface ResetPasswordInput { resetToken: string; password: string }

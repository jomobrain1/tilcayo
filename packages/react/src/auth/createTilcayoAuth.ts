import { createElement, Fragment, useCallback, useEffect, type ReactNode } from "react";
import { useSelector } from "react-redux";
import type { BaseQueryApi } from "@reduxjs/toolkit/query";
import { createApiClient } from "../api/createApiClient.js";
import type { TilcayoResponse } from "../api/types.js";
import { createTilcayoBaseQuery, toQueryError, type TilcayoBaseQuery, type TilcayoQueryError } from "../redux/baseQuery.js";
import { createTilcayoApi } from "../redux/createTilcayoApi.js";
import { authSlice } from "./state.js";
import type { AuthState, AuthTokens, AuthUser, FrontendAuthConfig, LoginInput, RegisterInput, ForgotPasswordInput, VerifyResetCodeInput, ResetPasswordInput } from "./types.js";

type UserResponse = TilcayoResponse<AuthUser | null>;
const anonymous = (): UserResponse => ({ success: true, message: "Not authenticated", data: null });
const stale = (): { error: TilcayoQueryError } => ({ error: { kind: "abort", message: "Session changed or request cancelled" } });

function safeUser(user: AuthUser): AuthUser {
  if (!user || typeof user.id !== "string" || typeof user.name !== "string" || typeof user.email !== "string") {
    throw new TypeError("Invalid auth user response");
  }
  return {
    id: user.id, name: user.name, email: user.email,
    ...(Array.isArray(user.roles) && user.roles.every(role => typeof role === "string") ? { roles: [...user.roles] } : {}),
    ...(typeof user.createdAt === "string" ? { createdAt: user.createdAt } : {}),
    ...(typeof user.updatedAt === "string" ? { updatedAt: user.updatedAt } : {}),
  };
}
function safeTokens(tokens: AuthTokens): AuthTokens {
  if (!tokens || tokens.tokenType !== "Bearer" || !tokens.accessToken || !tokens.refreshToken) throw new TypeError("Invalid auth token response");
  return { tokenType: "Bearer", accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
}

/** One instance per app/store (and per SSR request). Tokens stay outside Redux. */
export function createTilcayoAuth({ initialTokens, authPath = "/auth", tagTypes = [], ...config }: FrontendAuthConfig = {}) {
  const prefix = authPath.replace(/\/+$/, "");
  if (!/^\/(?:[a-zA-Z0-9_-]+\/?)*$/.test(prefix)) throw new TypeError("authPath must be an absolute route path");
  let tokens = initialTokens ? safeTokens(initialTokens) : null;
  let generation = 0;
  let refreshing: Promise<TilcayoQueryError | null> | undefined;
  let refreshController: AbortController | undefined;
  const client = createApiClient({
    ...config, baseUrl: config.baseUrl ?? "/api",
    headers: async () => {
      const headers = new Headers(typeof config.headers === "function" ? await config.headers() : config.headers);
      if (tokens) headers.set("Authorization", `Bearer ${tokens.accessToken}`);
      return headers;
    },
  });
  const plain = createTilcayoBaseQuery({ client });
  const isCurrent = (version: number, context: BaseQueryApi) => version === generation && !context.signal.aborted;
  function forget(context: BaseQueryApi) {
    generation++;
    tokens = null;
    refreshController?.abort();
    refreshing = undefined;
    context.dispatch(authSlice.actions.session(null));
    context.dispatch(baseApi.util.resetApiState());
  }

  async function refresh(context: BaseQueryApi): Promise<TilcayoQueryError | null> {
    if (refreshing) return refreshing;
    if (!tokens) return { kind: "http", statusCode: 401, code: "UNAUTHORIZED", message: "Not authenticated" };
    const version = generation;
    const refreshToken = tokens.refreshToken;
    const controller = new AbortController();
    refreshController = controller;
    const pending = (async () => {
      try {
        const response = await client.post<TilcayoResponse<{ tokens: AuthTokens }>>(`${prefix}/refresh`, { refreshToken }, { signal: controller.signal });
        if (version !== generation) return stale().error;
        tokens = safeTokens(response.data.tokens);
        return null;
      } catch (error) {
        if (version === generation) forget(context);
        return toQueryError(error);
      }
    })();
    refreshing = pending;
    try { return await pending; }
    finally { if (refreshing === pending) refreshing = undefined; }
  }

  const baseQuery: TilcayoBaseQuery = async (args, context, extra) => {
    const version = generation;
    const access = tokens?.accessToken;
    let result = await plain(args, context, extra);
    if (!isCurrent(version, context)) return stale();
    const url = (typeof args === "string" ? args : args.url).split(/[?#]/)[0].replace(/\/+$/, "");
    const authOperation = ["login", "register", "refresh", "logout", "forgot-password", "verify-reset-code", "reset-password"].some(name => url === `${prefix}/${name}`);
    if (result.error?.statusCode === 401 && tokens && !authOperation) {
      if (tokens.accessToken === access) {
        const error = await refresh(context);
        if (error) return { error };
      }
      if (!isCurrent(version, context)) return stale();
      result = await plain(args, context, extra);
      if (!isCurrent(version, context)) return stale();
      if (result.error?.statusCode === 401) forget(context);
    }
    return result;
  };
  const baseApi = createTilcayoApi({ baseQuery, tagTypes });
  // Assigned after injection to avoid a recursive inferred API type.
  let syncMe: (context: BaseQueryApi, response: UserResponse) => Promise<void> = async () => {};

  async function authenticate(operation: "login" | "register", input: LoginInput | RegisterInput, context: BaseQueryApi) {
    if (tokens) return { error: { kind: "client" as const, message: "Log out before starting another session" } };
    const version = ++generation;
    try {
      const response = await client.post<TilcayoResponse<{ user: AuthUser; tokens: AuthTokens }>>(`${prefix}/${operation}`, input, { signal: context.signal });
      if (!isCurrent(version, context)) return stale();
      const user = safeUser(response.data.user);
      tokens = safeTokens(response.data.tokens);
      const sanitized: UserResponse = { success: true, message: response.message, data: user };
      context.dispatch(authSlice.actions.session(user));
      await syncMe(context, sanitized);
      context.dispatch(baseApi.util.invalidateTags(tagTypes));
      return { data: sanitized };
    } catch (error) {
      if (version === generation) context.dispatch(authSlice.actions.session(null));
      return { error: toQueryError(error) };
    }
  }

  const api = baseApi.injectEndpoints({ endpoints: builder => ({
    login: builder.mutation<UserResponse, LoginInput>({ queryFn: (input, context) => authenticate("login", input, context) }),
    register: builder.mutation<UserResponse, RegisterInput>({ queryFn: (input, context) => authenticate("register", input, context) }),
    forgotPassword: builder.mutation<TilcayoResponse<null>, ForgotPasswordInput>({
      query: body => ({ url: `${prefix}/forgot-password`, method: "POST", body }),
    }),
    verifyResetCode: builder.mutation<TilcayoResponse<{ resetToken: string }>, VerifyResetCodeInput>({
      query: body => ({ url: `${prefix}/verify-reset-code`, method: "POST", body }),
    }),
    resetPassword: builder.mutation<TilcayoResponse<null>, ResetPasswordInput>({
      query: body => ({ url: `${prefix}/reset-password`, method: "POST", body }),
    }),
    me: builder.query<UserResponse, void>({
      async queryFn(_arg, context) {
        if (!tokens) {
          context.dispatch(authSlice.actions.session(null));
          return { data: anonymous() };
        }
        const version = generation;
        const result = await baseQuery(`${prefix}/me`, context, {});
        if (!isCurrent(version, context)) {
          if (!tokens && !context.signal.aborted) return { data: anonymous() };
          return stale();
        }
        if (result.error) {
          if (result.error.statusCode === 401) { forget(context); return { data: anonymous() }; }
          context.dispatch(authSlice.actions.ready());
          return { error: result.error };
        }
        try {
          const response = result.data as TilcayoResponse<AuthUser>;
          const user = safeUser(response.data);
          context.dispatch(authSlice.actions.session(user));
          return { data: { ...response, data: user } };
        } catch (error) {
          context.dispatch(authSlice.actions.ready());
          return { error: toQueryError(error) };
        }
      },
    }),
    refresh: builder.mutation<null, void>({
      async queryFn(_arg, context) {
        const error = await refresh(context);
        return error ? { error } : { data: null };
      },
    }),
    logout: builder.mutation<null, void>({
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try { await queryFulfilled; } catch { /* Local logout still clears cached data. */ }
        if (!tokens) dispatch(baseApi.util.resetApiState());
      },
      async queryFn(_arg, context) {
        // Finish token rotation before revoking, otherwise logout could revoke an
        // already consumed refresh token while leaving its replacement valid.
        if (refreshing) await refreshing;
        const previous = tokens;
        ++generation;
        tokens = null;
        refreshController?.abort();
        refreshing = undefined;
        context.dispatch(authSlice.actions.session(null));
        await syncMe(context, anonymous());
        try {
          if (previous) await client.post(`${prefix}/logout`, { refreshToken: previous.refreshToken }, { signal: context.signal });
          return { data: null };
        } catch (error) { return { error: toQueryError(error) }; }
      },
    }),
  }) });
  syncMe = async (context, response) => { await context.dispatch(api.util.upsertQueryData("me", undefined, response)); };

  function useAuth() {
    const session = useSelector((state: { auth: AuthState }) => state.auth);
    const [triggerLogin, loginStatus] = api.useLoginMutation();
    const [triggerRegister, registerStatus] = api.useRegisterMutation();
    const [triggerLogout, logoutStatus] = api.useLogoutMutation();
    const [triggerForgotPassword, forgotPasswordStatus] = api.useForgotPasswordMutation();
    const [triggerVerifyResetCode, verifyResetCodeStatus] = api.useVerifyResetCodeMutation();
    const [triggerResetPassword, resetPasswordStatus] = api.useResetPasswordMutation();
    const forgotPassword = useCallback((input: ForgotPasswordInput) => triggerForgotPassword(input).unwrap(), [triggerForgotPassword]);
    const verifyResetCode = useCallback((input: VerifyResetCodeInput) => triggerVerifyResetCode(input).unwrap(), [triggerVerifyResetCode]);
    const resetPassword = useCallback((input: ResetPasswordInput) => triggerResetPassword(input).unwrap(), [triggerResetPassword]);
    const [triggerRestore] = api.useLazyMeQuery();
    const restoreStatus = api.endpoints.me.useQueryState(undefined);
    const login = useCallback((input: LoginInput) => triggerLogin(input).unwrap(), [triggerLogin]);
    const register = useCallback((input: RegisterInput) => triggerRegister(input).unwrap(), [triggerRegister]);
    const logout = useCallback(() => triggerLogout().unwrap(), [triggerLogout]);
    const restoreSession = useCallback(() => triggerRestore(undefined).unwrap(), [triggerRestore]);
    return {
      ...session, login, register, logout, restoreSession, forgotPassword, verifyResetCode, resetPassword,
      forgotPasswordStatus, verifyResetCodeStatus, resetPasswordStatus,
      loading: loginStatus.isLoading || registerStatus.isLoading || logoutStatus.isLoading || restoreStatus.isFetching,
      error: loginStatus.error ?? registerStatus.error ?? logoutStatus.error ?? restoreStatus.error ?? null,
      loginStatus, registerStatus, logoutStatus, restoreStatus,
    };
  }
  function AuthBootstrap({ children, fallback = null }: { children?: ReactNode; fallback?: ReactNode }) {
    const { initialized, restoreSession } = useAuth();
    useEffect(() => { if (!initialized) void restoreSession().catch(() => {}); }, [initialized, restoreSession]);
    return createElement(Fragment, null, initialized ? children : fallback);
  }
  return { api, authReducer: authSlice.reducer, useAuth, AuthBootstrap };
}

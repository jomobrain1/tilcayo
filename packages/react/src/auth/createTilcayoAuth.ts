import { createElement, Fragment, useCallback, useEffect, type ReactNode } from "react";
import { useSelector } from "react-redux";
import type { BaseQueryApi } from "@reduxjs/toolkit/query";
import { createApiClient } from "../api/createApiClient.js";
import type { TilcayoResponse } from "../api/types.js";
import { createTilcayoBaseQuery, toQueryError, type TilcayoBaseQuery, type TilcayoQueryError } from "../redux/baseQuery.js";
import { createTilcayoApi } from "../redux/createTilcayoApi.js";
import { authSlice } from "./state.js";
import type { AuthState, AuthTokens, AuthUser, FrontendAuthConfig, LoginInput, RegisterInput, ForgotPasswordInput, VerifyResetCodeInput, ResetPasswordInput } from "./types.js";

type RefreshResult = { error: TilcayoQueryError | null; user?: AuthUser };
type UserResponse = TilcayoResponse<AuthUser | null>;
const anonymous = (): UserResponse => ({ success: true, message: "Not authenticated", data: null });
const stale = (): { error: TilcayoQueryError } => ({ error: { kind: "abort", message: "Session changed or request cancelled" } });

function safeUser(user: AuthUser): AuthUser {
  if (!user || typeof user.id !== "string" || typeof user.name !== "string" || typeof user.email !== "string") {
    throw new TypeError("Invalid auth user response");
  }
  return {
    ...(user.platformRole === 'superadmin' ? { platformRole: user.platformRole } : {}),
    ...(typeof user.tenancyEnabled === 'boolean' ? { tenancyEnabled: user.tenancyEnabled } : {}),
    ...(user.tenant && typeof user.tenant.id === 'string' && typeof user.tenant.name === 'string' && typeof user.tenant.slug === 'string' ? { tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug } } : {}),
    ...(typeof user.avatarUrl === 'string' && /^https:\/\//.test(user.avatarUrl) ? { avatarUrl: user.avatarUrl } : {}),
    id: user.id, name: user.name, email: user.email,
    ...(Array.isArray(user.roles) && user.roles.every(role => typeof role === "string") ? { roles: [...user.roles] } : {}),
    ...(Array.isArray(user.adminTabs) && user.adminTabs.every(tab => typeof tab === "string") ? { adminTabs: [...user.adminTabs] } : {}),
    ...(typeof user.createdAt === "string" ? { createdAt: user.createdAt } : {}),
    ...(typeof user.updatedAt === "string" ? { updatedAt: user.updatedAt } : {}),
  };
}
function safeTokens(tokens: AuthTokens): AuthTokens {
  if (!tokens || tokens.tokenType !== "Bearer" || !tokens.accessToken || !tokens.refreshToken) throw new TypeError("Invalid auth token response");
  return { tokenType: "Bearer", accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
}

/** One instance per app/store (and per SSR request). Tokens stay outside Redux. */
export function createTilcayoAuth({ initialTokens, cookieSession = false, authPath = "/auth", tagTypes = [], ...config }: FrontendAuthConfig = {}) {
  const prefix = authPath.replace(/\/+$/, "");
  if (!/^\/(?:[a-zA-Z0-9_-]+\/?)*$/.test(prefix)) throw new TypeError("authPath must be an absolute route path");
  let tokens = initialTokens ? safeTokens(initialTokens) : null;
  let generation = 0;
  let refreshing: Promise<RefreshResult> | undefined;
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

  async function refresh(context: BaseQueryApi): Promise<RefreshResult> {
    if (refreshing) return refreshing;
    if (!tokens && !cookieSession) return { error: { kind: "http", statusCode: 401, code: "UNAUTHORIZED", message: "Not authenticated" } };
    const version = generation;
    const refreshToken = tokens?.refreshToken;
    const controller = new AbortController();
    refreshController = controller;
    const pending = (async () => {
      try {
        const response = await client.post<TilcayoResponse<{ tokens: AuthTokens; user?: AuthUser }>>(`${prefix}/refresh`, cookieSession ? {} : { refreshToken }, { signal: controller.signal });
        if (version !== generation) return stale();
        const nextTokens = safeTokens(response.data.tokens);
        const user = response.data.user === undefined ? undefined : safeUser(response.data.user);
        tokens = nextTokens;
        return { error: null, user };
      } catch (error) {
        if (version === generation && toQueryError(error).statusCode === 401) forget(context);
        return { error: toQueryError(error) };
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
        const { error } = await refresh(context);
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
    authorizeAvatar: builder.mutation<TilcayoResponse<{ ticket: string; uploadUrl: string; fields: Record<string, unknown> }>, { filename: string; bytes: number }>({ query: body => ({ url: `${prefix}/avatar/authorize`, method: 'POST', body }) }),
    completeAvatar: builder.mutation<TilcayoResponse<{ avatarUrl: string }>, { ticket: string }>({ query: body => ({ url: `${prefix}/avatar/complete`, method: 'POST', body }) }),
    removeAvatar: builder.mutation<TilcayoResponse<null>, void>({ query: () => ({ url: `${prefix}/avatar`, method: 'DELETE' }) }),
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
    updateProfile: builder.mutation<UserResponse, { name: string }>({
      async queryFn(body, context) {
        const version = generation;
        const result = await baseQuery({ url: `${prefix}/profile`, method: "PATCH", body }, context, {});
        if (!isCurrent(version, context)) return stale();
        if (result.error) return { error: result.error };
        try {
          const response = result.data as UserResponse;
          const user = safeUser(response.data!);
          const sanitized = { ...response, data: user };
          context.dispatch(authSlice.actions.session(user));
          await syncMe(context, sanitized);
          return { data: sanitized };
        } catch (error) { return { error: toQueryError(error) }; }
      },
    }),
    me: builder.query<UserResponse, void>({
      async queryFn(_arg, context) {
        if (!tokens && cookieSession) {
          const version = generation;
          const { error, user } = await refresh(context);
          if (!error && user) {
            if (!isCurrent(version, context)) return stale();
            context.dispatch(authSlice.actions.session(user));
            return { data: { success: true, message: "Session restored", data: user } };
          }
          if (error && error.statusCode !== 401) {
            context.dispatch(authSlice.actions.ready());
            return { error };
          }
        }
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
        const { error } = await refresh(context);
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
          if (previous || cookieSession) await client.post(`${prefix}/logout`, cookieSession ? {} : { refreshToken: previous!.refreshToken }, { signal: context.signal });
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
    const [triggerUpdateProfile, updateProfileStatus] = api.useUpdateProfileMutation();
    const updateProfile = useCallback((input: { name: string }) => triggerUpdateProfile(input).unwrap(), [triggerUpdateProfile]);
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
    const [authorizeAvatar] = api.useAuthorizeAvatarMutation();
    const [completeAvatar] = api.useCompleteAvatarMutation();
    const [triggerRemoveAvatar] = api.useRemoveAvatarMutation();
    const uploadAvatar = useCallback(async (file: File, options: { signal: AbortSignal; onProgress: (percent: number) => void }) => {
      if (options.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      const authorization = authorizeAvatar({ filename: file.name, bytes: file.size });
      const abortAuthorization = () => authorization.abort();
      options.signal.addEventListener('abort', abortAuthorization, { once: true });
      let response;
      try { response = await authorization.unwrap(); } finally { options.signal.removeEventListener('abort', abortAuthorization); }
      if (options.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      const { ticket, uploadUrl, fields } = response.data;
      if (!/^https:\/\/api\.cloudinary\.com\//.test(uploadUrl)) throw new Error('Invalid upload destination.');
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const abort = () => xhr.abort();
        const cleanup = () => options.signal.removeEventListener('abort', abort);
        xhr.open('POST', uploadUrl); xhr.timeout = 120000;
        xhr.upload.onprogress = event => { if (event.lengthComputable) options.onProgress(Math.round(event.loaded / event.total * 95)); };
        xhr.onload = () => { cleanup(); xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed. Try again.')); };
        xhr.onerror = xhr.ontimeout = () => { cleanup(); reject(new Error('Upload connection failed. Try again.')); };
        xhr.onabort = () => { cleanup(); reject(new DOMException('Cancelled', 'AbortError')); };
        const body = new FormData(); Object.entries(fields).forEach(([key, value]) => body.append(key, String(value))); body.append('file', file);
        options.signal.addEventListener('abort', abort, { once: true });
        if (options.signal.aborted) { cleanup(); reject(new DOMException('Cancelled', 'AbortError')); return; }
        xhr.send(body);
      });
      if (options.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      await completeAvatar({ ticket }).unwrap();
      await restoreSession(); options.onProgress(100);
    }, [authorizeAvatar, completeAvatar, restoreSession]);
    const removeAvatar = useCallback(async () => { await triggerRemoveAvatar().unwrap(); await restoreSession(); }, [triggerRemoveAvatar, restoreSession]);
    return {
      ...session, uploadAvatar, removeAvatar, updateProfile, updateProfileStatus, login, register, logout, restoreSession, forgotPassword, verifyResetCode, resetPassword,
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

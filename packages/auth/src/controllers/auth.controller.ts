import { randomBytes } from "node:crypto";
import {
  conflict,
  createHttpError,
  unauthorized,
  type TilcayoContext,
} from "@tilcayo/core";
import { User } from "../models/User.js";
import { toAuthUser } from "../toAuthUser.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { hashPassword, verifyPassword } from "../password.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from "../tokens.js";
import type { AuthConfig } from "../types.js";

type RegisterBody = { name: string; email: string; password: string };
type LoginBody = { email: string; password: string };
type RefreshBody = { refreshToken: string };

export function createAuthControllers(config: Readonly<Required<AuthConfig>>) {
  // Generated lazily per instance, to keep missing-email login on the bcrypt path.
  let dummyHash: Promise<string> | undefined;

  async function issueTokens(userId: string) {
    const [accessToken, refreshToken] = await Promise.all([
      createAccessToken(userId, config),
      createRefreshToken(userId, config),
    ]);
    const claims = await verifyRefreshToken(refreshToken, config);
    await RefreshToken.raw.create({
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(claims.exp * 1000),
    });
    return { tokenType: "Bearer" as const, accessToken, refreshToken };
  }

  // Register controller
  const register = async (ctx: TilcayoContext<RegisterBody>) => {
    await User.raw.init(); // Ensure the unique email index exists before writes.
    if (await User.exists({ email: ctx.body.email }))
      throw conflict("Email already registered");
    const passwordHash = await hashPassword(
      ctx.body.password,
      config.passwordRounds,
    );
    const user = await User.create({
      name: ctx.body.name,
      email: ctx.body.email,
      passwordHash,
    }).catch((error: unknown) => {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      )
        throw conflict("Email already registered");
      throw error;
    });
    const tokens = await issueTokens(String(user._id));
    return ctx.response.created(
      { user: toAuthUser(user), tokens },
      "Account created",
    );
  };

  // Login controller
  const login = async (ctx: TilcayoContext<LoginBody>) => {
    const user = await User.first({ email: ctx.body.email }, {
      select: ["+passwordHash"],
    });
    const hash =
      user?.passwordHash ??
      (await (dummyHash ??= hashPassword(
        randomBytes(32).toString("hex"),
        config.passwordRounds,
      )));
    const valid = await verifyPassword(ctx.body.password, hash);
    if (!user || !valid)
      throw createHttpError(401, "INVALID_CREDENTIALS", "Invalid credentials");
    const tokens = await issueTokens(String(user._id));
    return ctx.response.success(
      { user: toAuthUser(user), tokens },
      "Logged in",
    );
  };

  // Refresh controller
  const refresh = async (ctx: TilcayoContext<RefreshBody>) => {
    const token = await verifyRefreshToken(ctx.body.refreshToken, config);
    const user = await User.find(token.sub);
    if (!user) throw unauthorized("Invalid or expired token");
    // Compare-and-set: only one request can consume a valid token.
    const consumed = await RefreshToken.raw.findOneAndUpdate(
      {
        tokenHash: hashRefreshToken(ctx.body.refreshToken),
        userId: token.sub,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { $set: { revokedAt: new Date() } },
      { returnDocument: "before" },
    );
    if (!consumed) throw unauthorized("Invalid or expired token");
    const tokens = await issueTokens(token.sub);
    return ctx.response.success({ tokens }, "Tokens refreshed");
  };

  // Logout controller
  const logout = async (ctx: TilcayoContext<RefreshBody>) => {
    const token = await verifyRefreshToken(ctx.body.refreshToken, config).catch(
      () => null,
    );
    if (token)
      await RefreshToken.raw.updateOne(
        {
          tokenHash: hashRefreshToken(ctx.body.refreshToken),
          userId: token.sub,
          revokedAt: null,
        },
        { $set: { revokedAt: new Date() } },
      );
    return ctx.response.noContent();
  };

  return { register, login, refresh, logout };
}

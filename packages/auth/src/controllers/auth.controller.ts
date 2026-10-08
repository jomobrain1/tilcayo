import { randomBytes, randomInt, createHmac } from "node:crypto";
import {
  conflict,
  createHttpError,
  unauthorized,
  type TilcayoContext,
} from "@tilcayo/core";
import { PasswordReset } from "../models/PasswordReset.js";
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
import type { ResolvedAuthConfig } from "../types.js";

type RegisterBody = { name: string; email: string; password: string };
type LoginBody = { email: string; password: string };
type RefreshBody = { refreshToken: string };

export function createAuthControllers(config: ResolvedAuthConfig) {
  // Generated lazily per instance, to keep missing-email login on the bcrypt path.
  let dummyHash: Promise<string> | undefined;

  async function issueTokens(userId: string, sessionVersion = 0) {
    const [accessToken, refreshToken] = await Promise.all([
      createAccessToken(userId, config, sessionVersion),
      createRefreshToken(userId, config, sessionVersion),
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
    const tokens = await issueTokens(String(user._id), user.sessionVersion ?? 0);
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
    const tokens = await issueTokens(String(user._id), user.sessionVersion ?? 0);
    return ctx.response.success(
      { user: toAuthUser(user), tokens },
      "Logged in",
    );
  };

  // Refresh controller
  const refresh = async (ctx: TilcayoContext<RefreshBody>) => {
    const token = await verifyRefreshToken(ctx.body.refreshToken, config);
    const user = await User.find(token.sub);
    if (!user || (user.sessionVersion ?? 0) !== token.sessionVersion) throw unauthorized("Invalid or expired token");
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
    const tokens = await issueTokens(token.sub, token.sessionVersion);
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

  const resetHash = (kind: string, value: string) => createHmac("sha256", config.refreshTokenSecret)
    .update(`password-reset:${kind}:${value}`).digest("hex");
  const invalidReset = () => createHttpError(400, "INVALID_RESET", "Invalid or expired reset code. Request a new code.");

  const forgotPassword = async (ctx: TilcayoContext<{ email: string }>) => {
    if (!config.sendPasswordResetCode) throw createHttpError(503, "RESET_UNAVAILABLE", "Password recovery is not configured.");
    await PasswordReset.raw.init();
    const now = new Date();
    const emailHash = resetHash("email", ctx.body.email);
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const codeHash = resetHash("code", `${ctx.body.email}:${code}`);
    const expiresAt = new Date(now.getTime() + 10 * 60_000);
    const user = await User.first({ email: ctx.body.email });
    // Unique emailHash makes the resend cooldown atomic, including first requests.
    const reset = await PasswordReset.raw.findOneAndUpdate(
      { emailHash, sentAt: { $lte: new Date(now.getTime() - 60_000) } },
      { $set: { userId: user?._id ?? null, sessionVersion: user?.sessionVersion ?? 0,
        codeHash, resetTokenHash: null, attempts: 0, sentAt: now, expiresAt } },
      { upsert: true, returnDocument: "after" },
    ).catch((error: unknown) => {
      if (error && typeof error === "object" && "code" in error && error.code === 11000) return null;
      throw error;
    });
    if (reset && user) {
      // Delivery runs independently so provider latency cannot reveal account existence.
      void Promise.resolve().then(() => config.sendPasswordResetCode!({ email: ctx.body.email, code, expiresAt }))
        .catch(async () => {
          console.warn("Password reset email delivery failed.");
          await PasswordReset.raw.deleteOne({ emailHash, codeHash });
        }).catch(() => {});
    }
    return ctx.response.success(null, "If an account exists for that email, a reset code has been sent.");
  };

  const verifyResetCode = async (ctx: TilcayoContext<{ email: string; code: string }>) => {
    const emailHash = resetHash("email", ctx.body.email);
    const active = { emailHash, expiresAt: { $gt: new Date() }, resetTokenHash: null, attempts: { $lt: 5 } };
    const attempt = await PasswordReset.raw.findOneAndUpdate(active,
      { $inc: { attempts: 1 } }, { returnDocument: "after" });
    if (!attempt) throw invalidReset();
    const resetToken = randomBytes(32).toString("hex");
    const verified = await PasswordReset.raw.findOneAndUpdate(
      { _id: attempt._id, codeHash: resetHash("code", `${ctx.body.email}:${ctx.body.code}`),
        userId: { $ne: null }, resetTokenHash: null, attempts: { $lte: 5 }, expiresAt: { $gt: new Date() } },
      { $set: { resetTokenHash: resetHash("token", resetToken) } },
    );
    if (!verified) throw invalidReset();
    return ctx.response.success({ resetToken }, "Code verified");
  };

  const resetPassword = async (ctx: TilcayoContext<{ resetToken: string; password: string }>) => {
    const startedAt = new Date();
    const passwordHash = await hashPassword(ctx.body.password, config.passwordRounds);
    const reset = await PasswordReset.raw.findOneAndDelete({
      resetTokenHash: resetHash("token", ctx.body.resetToken), expiresAt: { $gt: new Date() }, userId: { $ne: null },
    });
    if (!reset) throw invalidReset();
    const user = await User.raw.findOneAndUpdate({ _id: reset.userId,
      ...(reset.sessionVersion === 0 ? { $or: [{ sessionVersion: 0 }, { sessionVersion: { $exists: false } }] }
        : { sessionVersion: reset.sessionVersion }),
    }, { $set: { passwordHash }, $inc: { sessionVersion: 1 } });
    if (!user) throw invalidReset();
    await RefreshToken.raw.updateMany({ userId: reset.userId, revokedAt: null, createdAt: { $lte: startedAt } }, { $set: { revokedAt: new Date() } });
    return ctx.response.success(null, "Password reset. Log in with your new password.");
  };

  return { register, login, refresh, logout, forgotPassword, verifyResetCode, resetPassword };
}

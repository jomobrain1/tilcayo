import { currentTenantScope, defineRoutes, createHttpError } from "@tilcayo/core";
import { tenantUserHandlers, validateWorkspaceRoles, roleScope } from "../tenantUsers.js";
import { hashPassword } from "../password.js";
import { registerSchema } from "../validators/auth.validator.js";
import { z } from "zod";
import type { createGuard } from "../guard.js";
import { User } from "../models/User.js";
import { AdminRole } from "../models/AdminRole.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { adminTabs } from "../adminAccess.js";
import { toAuthUser } from "../toAuthUser.js";
import { authRequestMiddleware } from "./auth.routes.js";

const params = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i) });
const usersQuery = z.strictObject({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).default(""),
  role: z.enum(["all", "admin", "member"]).default("all"),
  status: z.enum(["all", "active", "suspended"]).default("all"),
  deleted: z.enum(["active", "trash"]).default("active"),
});
const roleKey = z.string().regex(/^[a-z][a-z0-9_-]{1,39}$/).refine(key => !["admin", "superadmin", "member", "all"].includes(key), "This role name is reserved");
const rolesSchema = z.array(z.string().min(1).max(40)).max(20).refine(roles => new Set(roles).size === roles.length);
const validateRoles = validateWorkspaceRoles;
const createUser = z.strictObject({ ...registerSchema.shape, roles: rolesSchema.default([]) });
const roleInput = z.strictObject({ key: roleKey, name: z.string().trim().min(2).max(80), tabs: z.array(z.enum(adminTabs)).max(adminTabs.length).refine(tabs => !tabs.includes("access"), "Only administrators can manage access") });

export function createAdminRoutes(auth: ReturnType<typeof createGuard>, passwordRounds = 12) {
  const tenant = tenantUserHandlers(auth, passwordRounds);
  return defineRoutes(router => {
    router.group({ prefix: "/api/admin", middleware: [...authRequestMiddleware(), auth.middleware] }, () => {
      router.get("/users", async ctx => {
        if (currentTenantScope()?.tenantId) return tenant.list(ctx);
        const query = ctx.query as z.output<typeof usersQuery>;
        const platform = !!currentTenantScope()?.enabled;
        const administratorRole = platform ? "superadmin" : "admin";
        if (query.deleted === "trash" && !auth.user(ctx).adminTabs?.includes("trash")) throw createHttpError(403, "FORBIDDEN", "Access denied");
        const search = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const filter = {
          ...(query.status === "active" ? { suspendedAt: null } : query.status === "suspended" ? { suspendedAt: { $ne: null } } : {}),
          deletedAt: query.deleted === "trash" ? { $ne: null } : null,
          ...(search ? { $or: [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }] } : {}),
          ...(query.role === "admin" ? { roles: administratorRole } : query.role === "member" ? { roles: { $ne: administratorRole } } : {}),
        };
        const [page, totalUsers, adminUsers, recentUsers] = await Promise.all([
          User.paginate(query, { filter, select: ["name", "email", "roles", "createdAt", "updatedAt", "deletedAt", "suspendedAt"], sort: { createdAt: -1 } }),
          User.count({ deletedAt: null }),
          User.count({ roles: administratorRole, deletedAt: null }),
          User.count({ deletedAt: null, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
        ]);
        return ctx.response.success({ items: page.items.map(record => ({ ...toAuthUser(record), ...(platform ? { roles: record.roles.includes("superadmin") ? ["superadmin"] : [] } : {}) })), pagination: page.pagination, stats: { totalUsers, adminUsers, recentUsers } });
      }, { middleware: [auth.requireAdminTab("users")], validate: { query: usersQuery } });
      router.post("/users", async ctx => {
        if (currentTenantScope()?.tenantId) return tenant.create(ctx);
        const body = ctx.body as z.output<typeof createUser>;
        if (currentTenantScope()?.enabled && body.roles.length) throw createHttpError(422, "VALIDATION_ERROR", "Assign workspace roles through Tenants");
        await validateRoles(body.roles);
        await User.raw.init();
        if (await User.exists({ email: body.email })) throw createHttpError(409, "CONFLICT", "Email already registered");
        const passwordHash = await hashPassword(body.password, passwordRounds);
        const user = await User.create({ name: body.name, email: body.email, passwordHash, roles: body.roles }).catch((error: unknown) => {
          if (error && typeof error === "object" && "code" in error && error.code === 11000) throw createHttpError(409, "CONFLICT", "Email already registered");
          throw error;
        });
        return ctx.response.created(toAuthUser(user), "User created");
      }, { middleware: [auth.requireRole("admin")], validate: { body: createUser } });
      router.put("/users/:id/status", async ctx => {
        if (currentTenantScope()?.tenantId) return tenant.status(ctx);
        if (auth.user(ctx).id === ctx.params.id) throw createHttpError(409, "CONFLICT", "You cannot suspend your own account");
        const { suspended } = ctx.body as { suspended: boolean };
        const user = await User.raw.findOneAndUpdate(
          { _id: ctx.params.id, deletedAt: null },
          { $set: { suspendedAt: suspended ? new Date() : null }, $inc: { sessionVersion: 1 } },
          { returnDocument: "after" },
        );
        if (!user) throw createHttpError(404, "NOT_FOUND", "User not found");
        await RefreshToken.raw.updateMany({ userId: ctx.params.id, revokedAt: null }, { $set: { revokedAt: new Date() } });
        return ctx.response.success(toAuthUser(user), suspended ? "User suspended" : "User reactivated");
      }, { middleware: [auth.requireRole("admin")], validate: { params, body: z.strictObject({ suspended: z.boolean() }) } });
      router.get("/roles", async ctx => ctx.response.success([
        { key: "admin", name: "Administrator", tabs: [...adminTabs], builtIn: true },
        ...await AdminRole.raw.find(roleScope()).sort({ name: 1 }).lean(),
      ]), { middleware: [auth.requireRole("admin")] });
      router.put("/roles/:key", async ctx => {
        const body = ctx.body as z.output<typeof roleInput>;
        if (ctx.params.key !== body.key) throw createHttpError(422, "VALIDATION_ERROR", "Role keys must match");
        return ctx.response.success(await AdminRole.raw.findOneAndUpdate({ ...roleScope(), key: body.key }, { $set: body }, { upsert: true, returnDocument: "after", runValidators: true }));
      }, { middleware: [auth.requireRole("admin")], validate: { body: roleInput, params: z.object({ key: roleKey }) } });
      router.put("/users/:id/roles", async ctx => {
        if (currentTenantScope()?.tenantId) return tenant.roles(ctx);
        if (auth.user(ctx).id === ctx.params.id) throw createHttpError(409, "CONFLICT", "You cannot change your own administrator role");
        if (currentTenantScope()?.enabled) throw createHttpError(403, "FORBIDDEN", "Assign workspace roles through Tenants");
        const { roles } = ctx.body as { roles: string[] };
        await validateRoles(roles);
        const user = await User.raw.findOneAndUpdate({ _id: ctx.params.id, deletedAt: null }, { $set: { roles } }, { returnDocument: "after" });
        if (!user) throw createHttpError(404, "NOT_FOUND", "User not found");
        return ctx.response.success(toAuthUser(user));
      }, { middleware: [auth.requireRole("admin")], validate: { params, body: z.strictObject({ roles: rolesSchema }) } });
      router.delete("/users/:id", async ctx => {
        if (currentTenantScope()?.tenantId) return tenant.remove(ctx);
        if (auth.user(ctx).id === ctx.params.id) throw createHttpError(409, "CONFLICT", "You cannot delete your own account");
        const user = await User.findOrFail(ctx.params.id);
        if (user.roles?.includes("admin") && !auth.user(ctx).roles?.includes("admin")) throw createHttpError(403, "FORBIDDEN", "Only administrators can delete administrators");
        await User.raw.updateOne({ _id: ctx.params.id, deletedAt: null }, { $set: { deletedAt: new Date() }, $inc: { sessionVersion: 1 } });
        await RefreshToken.raw.updateMany({ userId: ctx.params.id, revokedAt: null }, { $set: { revokedAt: new Date() } });
        return ctx.response.noContent();
      }, { middleware: [auth.requireAdminTab("users")], validate: { params } });
      router.post("/users/:id/restore", async ctx => {
        if (currentTenantScope()?.tenantId) return tenant.restore(ctx);
        const user = await User.findOrFail(ctx.params.id);
        if (user.roles?.includes("admin") && !auth.user(ctx).roles?.includes("admin")) throw createHttpError(403, "FORBIDDEN", "Only administrators can restore administrators");
        await User.raw.updateOne({ _id: ctx.params.id }, { $set: { deletedAt: null } });
        return ctx.response.noContent();
      }, { middleware: [auth.requireAdminTab("users"), auth.requireAdminTab("trash")], validate: { params } });
    });
  });
}

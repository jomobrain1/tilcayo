import { defineRoutes } from "@tilcayo/core";
import { z } from "zod";
import type { createGuard } from "../guard.js";
import { User } from "../models/User.js";
import { toAuthUser } from "../toAuthUser.js";
import { authRequestMiddleware } from "./auth.routes.js";

const usersQuery = z.strictObject({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).default(""),
  role: z.enum(["all", "admin", "member"]).default("all"),
});

// Mount explicitly with app.routes(auth.adminRoutes). Roles are checked in MongoDB.
export function createAdminRoutes(auth: ReturnType<typeof createGuard>) {
  return defineRoutes(router => {
    router.group({ prefix: "/api/admin", middleware: [...authRequestMiddleware(), auth.middleware, auth.requireRole("admin")] }, () => {
      router.get("/users", async ctx => {
        const query = ctx.query as z.output<typeof usersQuery>;
        const search = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const filter = {
          ...(search ? { $or: [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }] } : {}),
          ...(query.role === "admin" ? { roles: "admin" } : query.role === "member" ? { roles: { $ne: "admin" } } : {}),
        };
        const [page, totalUsers, adminUsers, recentUsers] = await Promise.all([
          User.paginate(query, { filter, select: ["name", "email", "roles", "createdAt", "updatedAt"], sort: { createdAt: -1 } }),
          User.count(),
          User.count({ roles: "admin" }),
          User.count({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
        ]);
        return ctx.response.success({ items: page.items.map(toAuthUser), pagination: page.pagination, stats: { totalUsers, adminUsers, recentUsers } });
      }, { validate: { query: usersQuery } });
    });
  });
}

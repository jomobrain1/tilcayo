import { currentTenantScope } from "@tilcayo/core";
import type { AuthUser } from "./types.js";
import { AdminRole } from "./models/AdminRole.js";

export const adminTabs = ["overview", "users", "catalog", "inventory", "categories", "orders", "access", "trash"] as const;
export type AdminTab = typeof adminTabs[number];

export async function withAdminAccess(user: AuthUser): Promise<AuthUser> {
  if (user.roles?.includes("admin")) return { ...user, adminTabs: [...adminTabs] };
  if (!user.roles?.length) return { ...user, adminTabs: [] };
  const roles = await AdminRole.raw.find({ tenantId: currentTenantScope()?.tenantId ?? null, key: { $in: user.roles } }).lean();
  // Access management is reserved for the built-in administrator role.
  const allowed = new Set(roles.flatMap(role => role.tabs).filter(tab => tab !== "access" && adminTabs.includes(tab as AdminTab)));
  return { ...user, adminTabs: [...allowed] };
}

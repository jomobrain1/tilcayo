import type { Types } from "mongoose";
import type { AuthUser } from "./types.js";

type UserRecord = Omit<AuthUser, "id"> & { _id: Types.ObjectId; avatar?: { url?: string | null } | null };

// Only expose public user fields in responses.
export function toAuthUser(user: UserRecord): AuthUser {
  return {
    id: String(user._id),
    ...(user.avatar?.url ? { avatarUrl: user.avatar.url } : {}),
    name: user.name,
    email: user.email,
    roles: user.roles ?? [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    suspendedAt: user.suspendedAt ?? null,
    ...(user.deletedAt ? { deletedAt: user.deletedAt } : {}),
  };
}

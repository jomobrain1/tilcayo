import type { Types } from "mongoose";
import type { AuthUser } from "./types.js";

type UserRecord = Omit<AuthUser, "id"> & { _id: Types.ObjectId };

// Only expose public user fields in responses.
export function toAuthUser(user: UserRecord): AuthUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    roles: user.roles ?? [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

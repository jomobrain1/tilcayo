import mongoose, { type InferSchemaType } from "mongoose";
import type { AuthUser } from "../types.js";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
}, { timestamps: true, collection: "users" });

type UserDocument = InferSchemaType<typeof userSchema>;
export const User = mongoose.modelNames().includes("TilcayoUser")
  ? mongoose.model<UserDocument>("TilcayoUser")
  : mongoose.model<UserDocument>("TilcayoUser", userSchema);

export function toAuthUser(user: UserDocument & { _id: mongoose.Types.ObjectId }): AuthUser {
  return { id: String(user._id), name: user.name, email: user.email, createdAt: user.createdAt, updatedAt: user.updatedAt };
}

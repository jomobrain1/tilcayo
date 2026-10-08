import mongoose from "mongoose";
import { mongoModel } from "@tilcayo/core";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  sessionVersion: { type: Number, default: 0 },
  roles: { type: [String], default: [] },
}, { timestamps: true, collection: "users" });

export const User = mongoModel("TilcayoUser", userSchema);

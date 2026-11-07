import mongoose from "mongoose";
import { mongoModel } from "@tilcayo/core";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  avatar: { type: new mongoose.Schema({ publicId: String, resourceType: String, deliveryType: String, bytes: Number, url: String, version: Number, format: String }, { _id: false }), default: undefined },
  passwordHash: { type: String, required: true, select: false },
  sessionVersion: { type: Number, default: 0 },
  roles: { type: [String], default: [] },
  suspendedAt: { type: Date, default: null, index: true },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true, collection: "users" });

export const User = mongoModel("TilcayoUser", userSchema);

import mongoose from "mongoose";
import { mongoModel } from "@tilcayo/core";

// Also store requests for unknown emails so cooldowns and responses are identical.
const schema = new mongoose.Schema({
  emailHash: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, default: null },
  sessionVersion: { type: Number, default: 0 },
  codeHash: { type: String, required: true },
  resetTokenHash: { type: String, default: null, index: true },
  attempts: { type: Number, default: 0 },
  sentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { collection: "tilcayo_password_resets" });

export const PasswordReset = mongoModel("TilcayoPasswordReset", schema);

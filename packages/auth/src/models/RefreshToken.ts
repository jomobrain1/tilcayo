import mongoose, { type InferSchemaType } from "mongoose";

const refreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "TilcayoUser", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  revokedAt: { type: Date, default: null },
}, { timestamps: true, collection: "tilcayo_refresh_tokens" });

export const RefreshToken = mongoose.modelNames().includes("TilcayoRefreshToken")
  ? mongoose.model<InferSchemaType<typeof refreshTokenSchema>>("TilcayoRefreshToken")
  : mongoose.model<InferSchemaType<typeof refreshTokenSchema>>("TilcayoRefreshToken", refreshTokenSchema);

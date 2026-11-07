import mongoose from "mongoose";
import { mongoModel } from "@tilcayo/core";

const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  key: { type: String, required: true },
  name: { type: String, required: true },
  tabs: { type: [String], default: [] },
}, { timestamps: true, collection: "tilcayo_admin_roles" });

schema.index({ tenantId: 1, key: 1 }, { unique: true });

export const AdminRole = mongoModel("TilcayoAdminRole", schema);

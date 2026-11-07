import mongoose from 'mongoose';
import { mongoModel } from '@tilcayo/core';
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'TilcayoTenant', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'TilcayoUser', required: true, index: true },
  sessionVersion: { type: Number, default: 0 },
  roles: { type: [String], default: [] },
  suspendedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, collection: 'tilcayo_memberships' });
schema.index({ tenantId: 1, userId: 1 }, { unique: true });
export const Membership = mongoModel('TilcayoMembership', schema);

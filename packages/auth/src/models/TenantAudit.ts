import mongoose from 'mongoose';
import { mongoModel } from '@tilcayo/core';
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
  action: { type: String, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true, collection: 'tilcayo_tenant_audit' });
export const TenantAudit = mongoModel('TilcayoTenantAudit', schema);

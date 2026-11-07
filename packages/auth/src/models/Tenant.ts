import mongoose from 'mongoose';
import { mongoModel } from '@tilcayo/core';
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  status: { type: String, enum: ['active', 'suspended', 'archived'], default: 'active' },
  deletedAt: { type: Date, default: null, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'TilcayoUser', required: true },
}, { timestamps: true, collection: 'tilcayo_tenants' });
export const Tenant = mongoModel('TilcayoTenant', schema);

import mongoose from 'mongoose';
import { mongoModel } from '@tilcayo/core';

const schema = new mongoose.Schema({
  deletedAt: { type: Date, default: null, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  demoBatch: { type: String },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  customerEmail: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: ['KES', 'USD'], required: true },
  status: { type: String, enum: ['pending', 'fulfilled', 'cancelled'], default: 'pending' },
}, { timestamps: true });

const platformSchema = schema.clone();
platformSchema.set('collection', 'tilcayo_platform_orders');
platformSchema.path('productId').options.ref = 'PlatformProduct';
export const PlatformOrder = mongoModel('PlatformOrder', platformSchema);

export const Order = mongoModel('Order', schema, { tenantScoped: true });

import mongoose from 'mongoose';
import { mongoModel } from '@tilcayo/core';

const schema = new mongoose.Schema({
  deletedAt: { type: Date, default: null, index: true },
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, trim: true },
  category: { type: String, default: '', trim: true },
  imageUrl: { type: String, default: '' },
  demoBatch: { type: String },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: ['KES', 'USD'], default: 'KES' },
  stock: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
}, { timestamps: true });

const platformSchema = schema.clone();
platformSchema.set('collection', 'tilcayo_platform_products');
export const PlatformProduct = mongoModel('PlatformProduct', platformSchema);

export const Product = mongoModel('Product', schema, { tenantScoped: true });

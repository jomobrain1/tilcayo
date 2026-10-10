import type { GeneratedSource } from './frontend.js';

export function adminDemoFiles(): GeneratedSource[] {
  return [{ folder: 'scripts', name: 'seed-admin-demo.ts', source: `import mongoose from 'mongoose';
import { connectMongo, disconnectMongo } from '@tilcayo/core';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';

const batch = 'tilcayo-admin-demo-v1';
const photo = (id: string) => 'https://images.unsplash.com/' + id + '?auto=format&fit=crop&w=720&q=85';
const products = [
  { name: 'Studio Wireless Headphones', category: 'Audio', price: 8500, stock: 24, status: 'active', imageUrl: photo('photo-1505740420928-5e560c06d30e') },
  { name: 'Everyday Headphones', category: 'Audio', price: 4200, stock: 3, status: 'active', imageUrl: photo('photo-1505740420928-5e560c06d30e') },
  { name: 'Classic Everyday Watch', category: 'Accessories', price: 6400, stock: 18, status: 'active', imageUrl: photo('photo-1523275335684-37898b6baf30') },
  { name: 'Minimal Wristwatch', category: 'Accessories', price: 3900, stock: 0, status: 'active', imageUrl: photo('photo-1523275335684-37898b6baf30') },
  { name: 'Runner Sneakers', category: 'Footwear', price: 7800, stock: 12, status: 'active', imageUrl: photo('photo-1542291026-7eec264c27ff') },
  { name: 'City Sneakers', category: 'Footwear', price: 5500, stock: 5, status: 'active', imageUrl: photo('photo-1542291026-7eec264c27ff') },
  { name: 'Next Edition Headphones', category: 'Audio', price: 11000, stock: 0, status: 'draft', imageUrl: photo('photo-1505740420928-5e560c06d30e') },
  { name: 'Archive Watch', category: 'Accessories', price: 3200, stock: 7, status: 'archived', imageUrl: photo('photo-1523275335684-37898b6baf30') },
] as const;

export async function seedAdminDemo() {
  const ids = products.map((_, index) => new mongoose.Types.ObjectId('de' + (index + 1).toString(16).padStart(22, '0')));
  const orderIds = products.slice(0, 6).map((_, index) => new mongoose.Types.ObjectId('df' + (index + 1).toString(16).padStart(22, '0')));
  // Refuse an unlikely ID collision before writing; repeated runs preserve edits.
  const skus = products.map((_, index) => 'DEMO-' + String(index + 1).padStart(3, '0'));
  if (await Product.raw.exists({ $or: [{ _id: { $in: ids } }, { sku: { $in: skus } }], demoBatch: { $ne: batch } }) || await Order.raw.exists({ _id: { $in: orderIds }, demoBatch: { $ne: batch } })) {
    throw new Error('Demo IDs conflict with existing records. No demo records were written.');
  }
  for (const [index, product] of products.entries()) {
    const createdAt = new Date(Date.now() - index * 86400000);
    await Product.raw.updateOne({ _id: ids[index], demoBatch: batch }, { $setOnInsert: {
      ...product, sku: 'DEMO-' + String(index + 1).padStart(3, '0'), currency: 'KES', demoBatch: batch, createdAt, updatedAt: createdAt,
    } }, { upsert: true, timestamps: false, runValidators: true });
  }
  for (const [index, id] of orderIds.entries()) {
    const product = products[index];
    const quantity = index % 3 + 1;
    const createdAt = new Date(Date.now() - index * 86400000);
    await Order.raw.updateOne({ _id: id, demoBatch: batch }, { $setOnInsert: {
      productId: ids[index], productName: product.name, sku: 'DEMO-' + String(index + 1).padStart(3, '0'),
      customerEmail: 'demo.customer' + (index + 1) + '@example.test', quantity,
      unitPrice: product.price, total: product.price * quantity, currency: 'KES',
      status: (['pending', 'fulfilled', 'cancelled'] as const)[index % 3], demoBatch: batch, createdAt, updatedAt: createdAt,
    } }, { upsert: true, timestamps: false, runValidators: true });
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Set MONGODB_URI in api/.env first.');
  await connectMongo(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    if (process.argv.includes('--remove')) {
      await Order.raw.deleteMany({ demoBatch: batch });
      await Product.raw.deleteMany({ demoBatch: batch });
      console.log('Removed only the marked admin demo records.');
    } else {
      await seedAdminDemo();
      console.log('Demo catalog ready: 8 products, 3 categories, 6 orders. Existing data and demo edits were preserved.');
    }
  } finally { await disconnectMongo(); }
}

// Importing the seed helper in tests never connects or writes to a database.
if (process.argv[1]?.replaceAll('\\\\', '/').endsWith('/seed-admin-demo.js')) {
  main().catch(() => { console.error('Demo seed could not complete. Check MongoDB connectivity and demo record conflicts.'); process.exitCode = 1; });
}
` }];
}

import { connectMongo, disconnectMongo } from '@tilcayo/core';
import { bootstrapTenancy } from '@tilcayo/auth';
import { Note } from '../models/Note.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';

async function main() {
  const email = process.env.TENANCY_SUPERADMIN_EMAIL;
  const password = process.env.TENANCY_SUPERADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set TENANCY_SUPERADMIN_EMAIL and TENANCY_SUPERADMIN_PASSWORD for this setup command.');
  await connectMongo(process.env.MONGODB_URI || '', { serverSelectionTimeoutMS: 10000, autoIndex: false });
  try {
    await bootstrapTenancy({ email, password });
    // Setup does not create a tenant or change ownership of existing records.
    // Driver access is limited to this offline setup command, not request handlers.
    for (const model of [Note, Order, Product]) {
      const indexes = await model.raw.collection.indexes().catch(error => { if (error.code === 26) return []; throw error; });
      for (const index of indexes) if (index.unique && index.name === 'sku_1' && Object.keys(index.key).length === 1) await model.raw.collection.dropIndex(index.name!);
      await model.raw.createIndexes();
    }
    console.log('Super Admin ready. Create tenants and assign administrators in Tenant administration on the main domain.');
  } finally { await disconnectMongo(); }
}
main().catch(() => { console.error('Tenancy setup failed. Check bootstrap inputs, MongoDB connectivity and workspace conflicts.'); process.exitCode = 1; });

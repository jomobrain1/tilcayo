import { Tenant } from './models/Tenant.js';
import { Membership } from './models/Membership.js';
import { User } from './models/User.js';
import { AdminRole } from './models/AdminRole.js';
import { RefreshToken } from './models/RefreshToken.js';
import { hashPassword } from './password.js';
import { registerSchema } from './validators/auth.validator.js';

/** Explicit provisioning command; never invoked by an HTTP request or normal startup. */
export async function bootstrapTenancy(input: { email: string; password: string }) {
  const values = registerSchema.parse({ name: 'Platform administrator', email: input.email, password: input.password });
  await User.raw.createIndexes();
  const user = await User.raw.findOneAndUpdate({ email: values.email }, { $set: { passwordHash: await hashPassword(values.password, 12), deletedAt: null, suspendedAt: null }, $addToSet: { roles: 'superadmin' }, $setOnInsert: { name: values.name }, $inc: { sessionVersion: 1 } }, { upsert: true, returnDocument: 'after' });
  await RefreshToken.raw.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  // Initialize tenant uniqueness constraints without creating any tenant records.
  await Tenant.raw.createIndexes();
  await Membership.raw.createIndexes();
  // Upgrade legacy role indexes without changing role ownership or records.
  const indexes = await AdminRole.raw.collection.indexes().catch(() => []);
  const legacy = indexes.find(index => index.name === 'key_1' && index.unique && Object.keys(index.key).length === 1);
  if (legacy) await AdminRole.raw.collection.dropIndex('key_1');
  await AdminRole.raw.createIndexes();
  return { userId: String(user._id) };
}

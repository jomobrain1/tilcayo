import { AsyncLocalStorage } from 'node:async_hooks';
import { Schema, Types, type Query, type Document } from 'mongoose';
import { forbidden } from '../errors/httpErrors.js';

export interface TenantScope { tenantId?: string; membershipVersion?: number; enabled: boolean }
const marker = Symbol.for('tilcayo.tenantScoped');
export const hasTenantScope = (schema: Schema) => !!(schema as Schema & { [marker]?: boolean })[marker];
const storage = new AsyncLocalStorage<TenantScope>();
export const currentTenantScope = () => storage.getStore();
export const runInTenantScope = <T>(scope: TenantScope, action: () => T | PromiseLike<T>): Promise<T> => storage.run(scope, async () => await action());
export function requireTenantId(): string {
  const id = storage.getStore()?.tenantId;
  if (!id || !/^[a-f\d]{24}$/i.test(id)) throw forbidden('A tenant workspace is required');
  return id;
}

/** Add before compiling a tenant-owned model. Raw driver access bypasses Mongoose. */
export function tenantScopedSchema(schema: Schema) {
  Object.defineProperty(schema, marker, { value: true });
  schema.add({ tenantId: { type: Schema.Types.ObjectId, required: true, index: true, immutable: true } });
  schema.eachPath((name, path) => {
    if (path.options.unique) {
      path.index({ unique: false });
      schema.index({ tenantId: 1, [name]: 1 }, { unique: true });
    }
  });
  const assign = (doc: Document | Record<string, unknown>) => {
    const id = requireTenantId();
    const existing = 'get' in doc && typeof doc.get === 'function' ? doc.get('tenantId') : (doc as Record<string, unknown>).tenantId;
    if (existing && String(existing) !== id) throw forbidden('Tenant mismatch');
    if ('set' in doc && typeof doc.set === 'function') doc.set('tenantId', id);
    else (doc as Record<string, unknown>).tenantId = new Types.ObjectId(id);
  };
  schema.pre('validate', function () { assign(this); });
  schema.pre('save', function () { assign(this); });
  schema.pre('insertMany', function (docs: Record<string, unknown>[]) { docs.forEach(assign); });
  schema.pre('bulkWrite', function () { throw forbidden('Use scoped model writes instead of bulkWrite'); });
  schema.pre('estimatedDocumentCount', function () { throw forbidden('Use scoped countDocuments'); });
  schema.pre(/^(find|countDocuments|distinct|update|delete|replace)/, function (this: Query<unknown, unknown>) {
    const tenantId = requireTenantId();
    this.setQuery({ $and: [this.getFilter(), { tenantId }] });
    const update = this.getUpdate();
    if (!update) return;
    if (Array.isArray(update) || (this as unknown as { op: string }).op === 'replaceOne' || (this as unknown as { op: string }).op === 'findOneAndReplace') throw forbidden('Replacement and pipeline updates are unavailable for tenant records');
    for (const [key, value] of Object.entries(update)) {
      if (key === 'tenantId' || key.startsWith('tenantId.')) throw forbidden('Cannot change tenant');
      if (value && typeof value === 'object' && Object.keys(value).some(field => field === 'tenantId' || field.startsWith('tenantId.'))) throw forbidden('Cannot change tenant');
      if (key === '$rename' && Object.values(value as object).some(field => typeof field === 'string' && field.startsWith('tenantId'))) throw forbidden('Cannot change tenant');
    }
    if (this.getOptions().upsert) this.setUpdate({ ...update, $setOnInsert: { ...update.$setOnInsert, tenantId } });
  });
  schema.pre('aggregate', function () {
    const tenantId = new Types.ObjectId(requireTenantId());
    const pipeline = this.pipeline();
    const unsafe = (value: unknown): boolean => !!value && typeof value === 'object' && Object.entries(value).some(([key, item]) => ['$lookup', '$unionWith', '$graphLookup', '$out', '$merge', '$documents', '$search', '$geoNear', '$collStats', '$indexStats', '$currentOp', '$listLocalSessions', '$listSessions', '$planCacheStats', '$queryStats', '$searchMeta', '$vectorSearch'].includes(key) || unsafe(item));
    if (unsafe(pipeline)) throw forbidden('This aggregate stage needs an explicitly scoped implementation');
    pipeline.unshift({ $match: { tenantId } });
  });
}

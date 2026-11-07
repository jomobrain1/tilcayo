import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { createHttpError, isTilcayoHttpError, mongoModel, rateLimit, type TilcayoContext } from '@tilcayo/core';
import { User } from './models/User.js';

export interface AvatarStorage {
  authorizeUpload(input: { profile: string; filename: string; bytes: number; publicId: string }): { publicId: string; uploadUrl: string; fields: Record<string, unknown> };
  completeUpload(input: { profile: string; filename: string; bytes: number; publicId: string }): Promise<{ publicId: string; resourceType: string; deliveryType: string; bytes: number; url: string; version: number; format?: string }>;
  delete(asset: { publicId: string; resourceType: string; deliveryType: string }): Promise<void>;
}
const pending = mongoModel('TilcayoAvatarUpload', new mongoose.Schema({
  ticket: { type: String, unique: true }, userId: String, scope: String, publicId: String,
  filename: String, bytes: Number, expiresAt: { type: Date, expires: 0 },
}, { collection: 'tilcayo_avatar_uploads' }));

export function avatarControllers(storage: AvatarStorage | undefined, user: (ctx: TilcayoContext) => { id: string; tenant?: { id: string } }) {
  const attempts = rateLimit({ windowMs: 60_000, max: 12 });
  function configured() {
    if (!storage) throw createHttpError(503, 'STORAGE_NOT_CONFIGURED', 'Photo uploads are not configured.');
    return storage;
  }
  async function safe(action: () => Promise<unknown>) {
    try { return await action(); } catch (error) {
      if (isTilcayoHttpError(error)) throw error;
      const failure = error as { statusCode?: number; code?: string; message?: string };
      if (failure.code && failure.statusCode && failure.statusCode >= 400 && failure.statusCode <= 599) throw createHttpError(failure.statusCode, failure.code, failure.message ?? 'Upload failed.');
      throw createHttpError(502, 'UPLOAD_FAILED', 'Could not update your photo. Try again.');
    }
  }
  return {
    attempts,
    authorize: (ctx: TilcayoContext<{ filename: string; bytes: number }>) => safe(async () => {
      const account = user(ctx);
      const scope = account.tenant?.id ?? 'platform';
      const ticket = randomUUID();
      const authorization = configured().authorizeUpload({ profile: 'avatar', ...ctx.body, publicId: `${scope}/${account.id}/${ticket}` });
      await pending.create({ ticket, userId: account.id, scope, publicId: authorization.publicId, ...ctx.body, expiresAt: new Date(Date.now() + 10 * 60_000) });
      return ctx.response.success({ ticket, uploadUrl: authorization.uploadUrl, fields: authorization.fields });
    }),
    complete: (ctx: TilcayoContext<{ ticket: string }>) => safe(async () => {
      const account = user(ctx);
      const upload = await pending.raw.findOne({ ticket: ctx.body.ticket, userId: account.id, scope: account.tenant?.id ?? 'platform', expiresAt: { $gt: new Date() } }).lean();
      if (!upload) throw createHttpError(400, 'UPLOAD_EXPIRED', 'This upload expired. Choose the file again.');
      const asset = await configured().completeUpload({ profile: 'avatar', filename: upload.filename!, bytes: upload.bytes!, publicId: upload.publicId! });
      // Atomically claim the ticket: a completed authorization cannot be reused.
      const claimed = await pending.raw.deleteOne({ _id: upload._id });
      if (!claimed.deletedCount) throw createHttpError(409, 'UPLOAD_COMPLETED', 'This upload was already completed.');
      const previous = await User.raw.findOneAndUpdate({ _id: account.id, deletedAt: null, suspendedAt: null }, { $set: { avatar: asset } }, { new: false }).lean();
      if (!previous) throw createHttpError(401, 'UNAUTHORIZED', 'Please sign in again.');
      // Retain a failed-cleanup asset rather than failing an already saved photo.
      if (previous.avatar?.publicId) await configured().delete({ publicId: previous.avatar.publicId, resourceType: previous.avatar.resourceType ?? 'image', deliveryType: previous.avatar.deliveryType ?? 'upload' }).catch(() => undefined);
      return ctx.response.success({ avatarUrl: asset.url }, 'Photo updated.');
    }),
    remove: (ctx: TilcayoContext) => safe(async () => {
      configured();
      const account = user(ctx);
      const previous = await User.raw.findOneAndUpdate({ _id: account.id, deletedAt: null, suspendedAt: null }, { $unset: { avatar: 1 } }, { new: false }).lean();
      if (previous?.avatar?.publicId) await configured().delete({ publicId: previous.avatar.publicId, resourceType: previous.avatar.resourceType ?? 'image', deliveryType: previous.avatar.deliveryType ?? 'upload' }).catch(() => undefined);
      return ctx.response.success(null, 'Photo removed.');
    }),
  };
}

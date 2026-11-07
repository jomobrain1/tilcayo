import assert from 'node:assert/strict';
import { test } from 'node:test';
import mongoose from 'mongoose';
import { avatarControllers } from '../packages/auth/dist/avatar.js';
import { User } from '../packages/auth/dist/models/User.js';

test('avatar tickets bind the current account and tenant and cannot complete twice', async t => {
  const pending = mongoose.models.TilcayoAvatarUpload;
  let record, saved, deleted = 0;
  const account = { id: '1234567890abcdef12345678', tenant: { id: 'tenant-a' } };
  t.mock.method(pending, 'create', async value => { record = { ...value, _id: 'ticket-id' }; return record; });
  t.mock.method(pending, 'findOne', filter => ({ lean: async () => record && record.userId === filter.userId && record.scope === filter.scope && record.ticket === filter.ticket && record.expiresAt > new Date() ? record : null }));
  t.mock.method(pending, 'deleteOne', async () => { record = null; return { deletedCount: 1 }; });
  t.mock.method(User.raw, 'findOneAndUpdate', (filter, update) => ({ lean: async () => { assert.equal(filter._id, account.id); saved = update.$set?.avatar; return { avatar: { publicId: 'old', resourceType: 'image', deliveryType: 'upload' } }; } }));
  const storage = {
    authorizeUpload(input) { assert.equal(input.profile, 'avatar'); assert.ok(input.publicId.startsWith('tenant-a/' + account.id)); return { publicId: input.publicId, uploadUrl: 'https://api.cloudinary.com/test', fields: {} }; },
    async completeUpload(input) { return { publicId: input.publicId, resourceType: 'image', deliveryType: 'upload', bytes: input.bytes, url: 'https://res.cloudinary.com/test/avatar.png', version: 1 }; },
    async delete() { deleted++; },
  };
  const controller = avatarControllers(storage, () => account);
  const ctx = body => ({ body, response: { success: data => data } });
  const authorization = await controller.authorize(ctx({ filename: 'avatar.png', bytes: 100 }));
  account.tenant.id = 'tenant-b';
  await assert.rejects(controller.complete(ctx({ ticket: authorization.ticket })), /expired/);
  account.tenant.id = 'tenant-a';
  const result = await controller.complete(ctx({ ticket: authorization.ticket }));
  assert.equal(result.avatarUrl, saved.url);
  assert.equal(deleted, 1);
  await assert.rejects(controller.complete(ctx({ ticket: authorization.ticket })), /expired/);
});

test('unconfigured storage and expired tickets fail without changing the account', async t => {
  const context = { body: { filename: 'a.png', bytes: 100 }, response: { success: data => data } };
  await assert.rejects(avatarControllers(undefined, () => ({ id: 'user' })).authorize(context), /not configured/);
  t.mock.method(mongoose.models.TilcayoAvatarUpload, 'findOne', () => ({ lean: async () => null }));
  await assert.rejects(avatarControllers({}, () => ({ id: 'user' })).complete({ ...context, body: { ticket: 'expired' } }), /expired/);
});

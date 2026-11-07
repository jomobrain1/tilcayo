import assert from 'node:assert/strict';
import { test } from 'node:test';
import { v2 as cloudinary } from 'cloudinary';
import { createCloudinaryStorage } from '../dist/index.js';

const options = { cloudName: 'test-cloud', apiKey: 'public-key', apiSecret: 'test-secret', profiles: {
  avatar: { resourceType: 'image', deliveryType: 'upload', maxBytes: 2048, folder: 'avatars', allowedExtensions: ['jpg', 'png'] },
  document: { resourceType: 'raw', deliveryType: 'authenticated', maxBytes: 4096, folder: 'documents', allowedExtensions: ['pdf'] },
} };
test('profiles reject unsupported, empty and oversized files before signing', () => {
  const storage = createCloudinaryStorage(options);
  for (const input of [{ filename: 'bad.exe', bytes: 10 }, { filename: 'ok.png', bytes: 0 }, { filename: 'ok.png', bytes: 2049 }]) assert.throws(() => storage.authorizeUpload({ profile: 'avatar', publicId: 'tenant/user/asset', ...input }));
  assert.throws(() => createCloudinaryStorage({ profiles: options.profiles }).authorizeUpload({ profile: 'avatar', filename: 'ok.png', bytes: 12, publicId: 'asset' }), /not configured/);
});
test('signed upload includes all server policy fields and keeps secret private', () => {
  const storage = createCloudinaryStorage(options);
  const authorization = storage.authorizeUpload({ profile: 'document', filename: 'Report.PDF', bytes: 20, publicId: 'tenant/user/asset' });
  const { signature, api_key, ...signed } = authorization.fields;
  assert.equal(authorization.publicId, 'documents/tenant/user/asset.pdf');
  assert.equal(authorization.uploadUrl, 'https://api.cloudinary.com/v1_1/test-cloud/raw/upload');
  assert.equal(signature, cloudinary.utils.api_sign_request(signed, options.apiSecret));
  assert.equal(signed.overwrite, false);
  assert.equal(signed.type, 'authenticated');
  assert.ok(!JSON.stringify(authorization).includes(options.apiSecret));
});
test('completion verifies actual provider metadata, never browser response claims', async t => {
  const storage = createCloudinaryStorage(options);
  let actual = { public_id: 'avatars/t/u/id', bytes: 100, resource_type: 'image', type: 'upload', format: 'png', secure_url: 'https://res.cloudinary.com/test/image.png', version: 1 };
  t.mock.method(cloudinary.api, 'resource', async (_id, config) => { assert.equal(config.api_secret, options.apiSecret); return actual; });
  const input = { profile: 'avatar', publicId: actual.public_id, bytes: 100, filename: 'photo.png' };
  assert.equal((await storage.completeUpload(input)).url, actual.secure_url);
  for (const change of [{ bytes: 2049 }, { type: 'authenticated' }, { resource_type: 'raw' }, { format: 'svg' }, { public_id: 'someone-else' }]) {
    const original = actual; actual = { ...actual, ...change };
    await assert.rejects(storage.completeUpload(input), /does not match/); actual = original;
  }
});
test('provider errors are sanitized and deletion is idempotent', async t => {
  const storage = createCloudinaryStorage(options);
  t.mock.method(cloudinary.api, 'resource', async () => { throw new Error('provider credential details'); });
  await assert.rejects(storage.completeUpload({ profile: 'avatar', publicId: 'a', bytes: 100, filename: 'a.png' }), /could not complete/);
  t.mock.method(cloudinary.uploader, 'destroy', async () => ({ result: 'not found' }));
  await storage.delete({ publicId: 'a', resourceType: 'image', deliveryType: 'upload' });
});

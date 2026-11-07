import { v2 as sdk } from 'cloudinary';
import { extname } from 'node:path';
import { Readable } from 'node:stream';
import type { UploadApiResponse, UploadApiOptions } from 'cloudinary';

export interface UploadProfile {
  resourceType: 'image' | 'video' | 'raw';
  deliveryType: 'upload' | 'authenticated';
  allowedExtensions: readonly string[];
  maxBytes: number;
  folder: string;
}
export interface StoredAsset {
  publicId: string; resourceType: string; deliveryType: string; bytes: number;
  url: string; format?: string; version: number;
}
export interface StorageConfig {
  cloudName?: string; apiKey?: string; apiSecret?: string;
  profiles: Record<string, UploadProfile>;
}
export class StorageError extends Error {
  constructor(public code: string, message: string, public statusCode = 400) { super(message); }
}

/** Credentials are passed per request; global SDK configuration is unchanged. */
export function createCloudinaryStorage(config: StorageConfig) {
  const credentials = { cloud_name: config.cloudName, api_key: config.apiKey, api_secret: config.apiSecret, secure: true };
  function ready() {
    if (!config.cloudName || !config.apiKey || !config.apiSecret) throw new StorageError('STORAGE_NOT_CONFIGURED', 'File storage is not configured.', 503);
  }
  function profile(name: string) {
    const value = config.profiles[name];
    if (!value || !Number.isSafeInteger(value.maxBytes) || value.maxBytes < 1) throw new StorageError('UPLOAD_PROFILE_INVALID', 'Unknown or invalid upload profile.');
    return value;
  }
  function validateFile(input: { profile: string; filename: string; bytes: number }) {
    const rules = profile(input.profile);
    const extension = extname(input.filename ?? '').slice(1).toLowerCase();
    if (!rules.allowedExtensions.map(e => e.replace(/^\./, '').toLowerCase()).includes(extension)) throw new StorageError('FILE_TYPE_UNSUPPORTED', 'This file type is not supported.');
    if (!Number.isSafeInteger(input.bytes) || input.bytes < 1) throw new StorageError('FILE_EMPTY', 'Choose a non-empty file.');
    if (input.bytes > rules.maxBytes) throw new StorageError('FILE_TOO_LARGE', `Choose a file smaller than ${Math.ceil(rules.maxBytes / 1048576)} MB.`, 413);
    return extension;
  }
  function normalize(asset: UploadApiResponse): StoredAsset {
    return { publicId: asset.public_id, resourceType: asset.resource_type, deliveryType: asset.type, bytes: asset.bytes, url: asset.secure_url, format: asset.format, version: asset.version };
  }
  async function provider<T>(action: () => Promise<T>): Promise<T> {
    ready();
    try { return await action(); } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError('STORAGE_UNAVAILABLE', 'File storage could not complete the request. Try again.', 502);
    }
  }
  function authorizeUpload(input: { profile: string; filename: string; bytes: number; publicId: string }) {
    ready();
    const extension = validateFile(input);
    const rules = profile(input.profile);
    if (!/^[a-zA-Z0-9/_-]+$/.test(input.publicId)) throw new StorageError('PUBLIC_ID_INVALID', 'Invalid upload identifier.');
    const publicId = `${rules.folder}/${input.publicId}${rules.resourceType === 'raw' ? '.' + extension : ''}`;
    const fields = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000), overwrite: false, type: rules.deliveryType, allowed_formats: rules.allowedExtensions.map(e => e.replace(/^\./, '')).join(',') };
    return { publicId, uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName!)}/${rules.resourceType}/upload`, fields: { ...fields, api_key: config.apiKey!, signature: sdk.utils.api_sign_request(fields, config.apiSecret!) } };
  }
  async function completeUpload(input: { profile: string; publicId: string; bytes: number; filename: string }) {
    validateFile(input);
    const rules = profile(input.profile);
    return provider(async () => {
      const result = await sdk.api.resource(input.publicId, { ...credentials, resource_type: rules.resourceType, type: rules.deliveryType });
      const extension = extname(input.filename).slice(1).toLowerCase();
      if (result.public_id !== input.publicId || (rules.resourceType === 'raw' && result.bytes !== input.bytes) || !Number.isSafeInteger(result.bytes) || result.bytes < 1 || result.bytes > rules.maxBytes || result.resource_type !== rules.resourceType || result.type !== rules.deliveryType || (rules.resourceType !== 'raw' && !rules.allowedExtensions.includes(result.format))) throw new StorageError('UPLOAD_VERIFICATION_FAILED', 'The uploaded file does not match the selected file.');
      if (rules.resourceType === 'image' && extension === 'svg') throw new StorageError('FILE_TYPE_UNSUPPORTED', 'SVG is not supported by this profile.');
      return normalize(result);
    });
  }
  async function upload(input: { profile: string; file: Buffer; filename: string; publicId: string }) {
    const authorization = authorizeUpload({ ...input, bytes: input.file.length });
    const rules = profile(input.profile);
    return provider(() => new Promise<StoredAsset>((resolve, reject) => {
      const stream = sdk.uploader.upload_stream({ ...credentials, public_id: authorization.publicId, resource_type: rules.resourceType, type: rules.deliveryType, overwrite: false, allowed_formats: [...rules.allowedExtensions] as UploadApiOptions['allowed_formats'] }, (error, result) => error ? reject(error) : result ? resolve(normalize(result)) : reject(new Error('Empty upload response')));
      Readable.from(input.file).pipe(stream).on('error', reject);
    }));
  }
  async function remove(asset: Pick<StoredAsset, 'publicId' | 'resourceType' | 'deliveryType'>) {
    return provider(async () => {
      const result = await sdk.uploader.destroy(asset.publicId, { ...credentials, resource_type: asset.resourceType, type: asset.deliveryType, invalidate: true });
      if (!['ok', 'not found'].includes(result.result)) throw new StorageError('FILE_DELETE_FAILED', 'File storage could not delete this file.', 502);
    });
  }
  function getDownloadUrl(asset: Pick<StoredAsset, 'publicId' | 'resourceType' | 'deliveryType'>, options: { expiresInSeconds?: number } = {}) {
    ready();
    const seconds = options.expiresInSeconds ?? 300;
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 3600) throw new StorageError('EXPIRY_INVALID', 'Download expiry must be 1–3600 seconds.');
    const expiresAt = Math.floor(Date.now() / 1000) + seconds;
    return { url: sdk.utils.private_download_url(asset.publicId, '', { ...credentials, resource_type: asset.resourceType, type: asset.deliveryType, expires_at: expiresAt, attachment: true }), expiresAt: new Date(expiresAt * 1000).toISOString() };
  }
  return { validateFile, authorizeUpload, completeUpload, upload, delete: remove, getDownloadUrl };
}

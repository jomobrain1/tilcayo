# @tilcayo/cloudinary

Backend-only, profile-based Cloudinary storage for Tilcayo. Credentials are passed per request; the package does not change the SDK's global configuration.

```ts
import { createCloudinaryStorage } from '@tilcayo/cloudinary';

export const storage = createCloudinaryStorage({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET_KEY,
  profiles: {
    avatar: {
      resourceType: 'image', deliveryType: 'upload',
      allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
      maxBytes: 2 * 1024 * 1024, folder: 'tilcayo/avatars',
    },
  },
});
```

Pass `avatarStorage: storage` to `createAuth`. The auth routes provide authenticated `POST /api/auth/avatar/authorize`, `POST /api/auth/avatar/complete`, and `DELETE /api/auth/avatar`. Generated auth routes include these too. The frontend `useAuth()` exposes `uploadAvatar(file, { signal, onProgress })` and `removeAvatar()`.

`authorizeUpload({ profile, filename, bytes, publicId })` signs a direct upload; identifiers and profile choice must come from trusted backend code. Store a pending authorization bound to the authenticated account and tenant. `completeUpload()` retrieves provider metadata and verifies the expected identifier, size limit, resource type, delivery type and image format. It deliberately does not trust an upload response's unsigned metadata. The built-in avatar routes persist short-lived, single-use authorizations in MongoDB.

`upload({ profile, file: Buffer, filename, publicId })` uploads through the server. `validateFile()` checks extension and size. `delete({ publicId, resourceType, deliveryType })` accepts already-deleted assets. `getDownloadUrl(asset, { expiresInSeconds: 300 })` generates an expiring signed download, particularly for authenticated documents. Never persist expiring URLs as asset identity.

Avatar uploads are public and attached to the shared user identity across workspaces. Documents should use authenticated delivery with application authorization before issuing downloads. Store asset metadata with its owner; never delete arbitrary public IDs provided by a browser. Configure matching Cloudinary upload-preset limits when you also need provider-side rejection of oversized direct transfers. Schedule cleanup for abandoned uploads and failed replacement cleanup; expiring pending database records alone do not delete Cloudinary assets. Soft deletion should retain files until permanent deletion or a retention policy runs.

Missing credentials leave the app usable and return a clear 503 when an upload is attempted. Configure secrets only in the backend `.env`; example files contain blanks.

Cloudinary may normalize uploaded images, so verified stored bytes must be positive and within the profile limit. Raw documents additionally require an exact byte count.

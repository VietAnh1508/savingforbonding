export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

/** Maps allowed MIME types to the file extension used for the stored object key. */
export const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const AVATAR_SIZE_ERROR = `Image must be ${MAX_AVATAR_SIZE_BYTES / (1024 * 1024)}MB or smaller`;
export const AVATAR_TYPE_ERROR = "Only JPEG, PNG, or WebP images are allowed";

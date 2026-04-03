const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export type MediaType = "image" | "video";

export function validateFile(
  contentType: string,
  size: number
): { valid: true; mediaType: MediaType } | { valid: false; error: string } {
  const isImage = ALLOWED_IMAGE_TYPES.includes(contentType);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(contentType);

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: `Unsupported file type: ${contentType}. Allowed: JPEG, PNG, WebP, HEIC, MP4, MOV`,
    };
  }

  if (isImage && size > MAX_IMAGE_SIZE) {
    return { valid: false, error: "Image must be under 10MB" };
  }

  if (isVideo && size > MAX_VIDEO_SIZE) {
    return { valid: false, error: "Video must be under 50MB" };
  }

  return { valid: true, mediaType: isImage ? "image" : "video" };
}

export async function uploadToR2(
  bucket: R2Bucket,
  key: string,
  body: ReadableStream | ArrayBuffer,
  contentType: string
): Promise<void> {
  await bucket.put(key, body, {
    httpMetadata: { contentType },
  });
}

export async function deleteFromR2(
  bucket: R2Bucket,
  keys: string[]
): Promise<void> {
  await bucket.delete(keys);
}

export function getFileExtension(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
  };
  return map[contentType] || "bin";
}

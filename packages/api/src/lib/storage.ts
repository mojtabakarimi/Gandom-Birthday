import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { dirname, join } from "path";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

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

export async function saveFile(
  uploadDir: string,
  key: string,
  data: Buffer
): Promise<void> {
  const fullPath = join(uploadDir, key);
  const dir = dirname(fullPath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(fullPath, data);
}

export async function deleteFiles(
  uploadDir: string,
  keys: string[]
): Promise<void> {
  for (const key of keys) {
    try {
      await unlink(join(uploadDir, key));
    } catch {
      // File may not exist
    }
  }
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

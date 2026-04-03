import { Hono } from "hono";
import type { Env, User } from "../types";
import { generateUUID } from "../lib/crypto";
import {
  validateFile,
  uploadToR2,
  getFileExtension,
} from "../lib/storage";
import { requireAuth } from "../middleware/auth";

const uploads = new Hono<{
  Bindings: Env;
  Variables: { user: User; sessionId: string };
}>();

// Upload a file
uploads.post("/", requireAuth, async (c) => {
  const user = c.get("user");

  // Check upload limit
  const settings = await c.env.DB.prepare(
    "SELECT value FROM site_settings WHERE key = 'max_uploads_per_user'"
  ).first<{ value: string }>();
  const maxUploads = parseInt(settings?.value || "20", 10);

  const countResult = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM uploads WHERE user_id = ?"
  )
    .bind(user.id)
    .first<{ count: number }>();

  if ((countResult?.count || 0) >= maxUploads) {
    return c.json({ error: `Upload limit reached (${maxUploads})` }, 400);
  }

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  const caption = (formData.get("caption") as string) || null;

  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  const validation = validateFile(file.type, file.size);
  if (!validation.valid) {
    return c.json({ error: validation.error }, 400);
  }

  const uploadId = generateUUID();
  const ext = getFileExtension(file.type);
  const fileKey = `uploads/${user.id}/${uploadId}.${ext}`;

  await uploadToR2(
    c.env.BUCKET,
    fileKey,
    await file.arrayBuffer(),
    file.type
  );

  await c.env.DB.prepare(
    `INSERT INTO uploads (id, user_id, file_key, media_type, caption, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`
  )
    .bind(uploadId, user.id, fileKey, validation.mediaType, caption)
    .run();

  const upload = await c.env.DB.prepare("SELECT * FROM uploads WHERE id = ?")
    .bind(uploadId)
    .first();

  return c.json({ upload }, 201);
});

// Get current user's uploads
uploads.get("/mine", requireAuth, async (c) => {
  const user = c.get("user");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM uploads WHERE user_id = ? ORDER BY uploaded_at DESC"
  )
    .bind(user.id)
    .all();

  return c.json({ uploads: results });
});

export { uploads };

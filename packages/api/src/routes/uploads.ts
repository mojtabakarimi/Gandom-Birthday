import { Hono } from "hono";
import type { Env, User } from "../types";
import { generateUUID } from "../lib/crypto";
import { validateFile, saveFile, getFileExtension } from "../lib/storage";
import { requireAuth } from "../middleware/auth";

const uploads = new Hono<{
  Variables: Env & { user: User; sessionId: string };
}>();

uploads.post("/", requireAuth, async (c) => {
  const db = c.get("db");
  const uploadDir = c.get("uploadDir");
  const user = c.get("user");

  const settingsResult = await db.query(
    "SELECT value FROM site_settings WHERE key = 'max_uploads_per_user'"
  );
  const maxUploads = parseInt(settingsResult.rows[0]?.value || "20", 10);

  const countResult = await db.query(
    "SELECT COUNT(*) as count FROM uploads WHERE user_id = $1",
    [user.id]
  );

  if (parseInt(countResult.rows[0].count, 10) >= maxUploads) {
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

  const buffer = Buffer.from(await file.arrayBuffer());
  await saveFile(uploadDir, fileKey, buffer);

  await db.query(
    `INSERT INTO uploads (id, user_id, file_key, media_type, caption, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')`,
    [uploadId, user.id, fileKey, validation.mediaType, caption]
  );

  const result = await db.query("SELECT * FROM uploads WHERE id = $1", [uploadId]);

  return c.json({ upload: result.rows[0] }, 201);
});

uploads.get("/mine", requireAuth, async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const result = await db.query(
    "SELECT * FROM uploads WHERE user_id = $1 ORDER BY uploaded_at DESC",
    [user.id]
  );

  return c.json({ uploads: result.rows });
});

export { uploads };

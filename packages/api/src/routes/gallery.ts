import { Hono } from "hono";
import type { Env, User } from "../types";
import { requireAuth } from "../middleware/auth";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import { lookup } from "mime-types";
import { Readable } from "stream";

const gallery = new Hono<{
  Variables: Env & { user: User; sessionId: string };
}>();

gallery.get("/", requireAuth, async (c) => {
  const db = c.get("db");
  const result = await db.query(
    `SELECT u.id, u.file_key, u.thumbnail_key, u.media_type, u.caption,
            u.uploaded_at, usr.display_name
     FROM uploads u
     JOIN users usr ON u.user_id = usr.id
     WHERE u.status = 'approved'
     ORDER BY u.uploaded_at DESC`
  );

  return c.json({ items: result.rows });
});

gallery.get("/settings", async (c) => {
  const db = c.get("db");
  const result = await db.query("SELECT key, value FROM site_settings");

  const settings: Record<string, string> = {};
  for (const row of result.rows) {
    settings[row.key] = row.value;
  }

  return c.json({ settings });
});

gallery.get("/file/*", requireAuth, async (c) => {
  const uploadDir = c.get("uploadDir");
  const key = c.req.path.replace("/api/gallery/file/", "");
  const filePath = join(uploadDir, key);

  if (!existsSync(filePath)) {
    return c.json({ error: "File not found" }, 404);
  }

  const contentType = lookup(filePath) || "application/octet-stream";
  const stream = createReadStream(filePath);
  const webStream = Readable.toWeb(stream) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000",
    },
  });
});

export { gallery };

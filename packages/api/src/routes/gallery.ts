import { Hono } from "hono";
import type { Env, User } from "../types";
import { requireAuth } from "../middleware/auth";

const gallery = new Hono<{
  Bindings: Env;
  Variables: { user: User; sessionId: string };
}>();

// Get approved gallery items
gallery.get("/", requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.file_key, u.thumbnail_key, u.media_type, u.caption,
            u.uploaded_at, usr.display_name
     FROM uploads u
     JOIN users usr ON u.user_id = usr.id
     WHERE u.status = 'approved'
     ORDER BY u.uploaded_at DESC`
  ).all();

  return c.json({ items: results });
});

// Get public site settings (for birthday animation page)
gallery.get("/settings", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT key, value FROM site_settings"
  ).all();

  const settings: Record<string, string> = {};
  for (const row of results as Array<{ key: string; value: string }>) {
    settings[row.key] = row.value;
  }

  return c.json({ settings });
});

// Get file from R2 (serves images/videos)
gallery.get("/file/:key{.+}", requireAuth, async (c) => {
  const key = c.req.param("key");
  const object = await c.env.BUCKET.get(key);

  if (!object) {
    return c.json({ error: "File not found" }, 404);
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    object.httpMetadata?.contentType || "application/octet-stream"
  );
  headers.set("Cache-Control", "public, max-age=31536000");

  return new Response(object.body, { headers });
});

export { gallery };

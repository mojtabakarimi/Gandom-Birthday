import { Hono } from "hono";
import type { Env, User, Upload } from "../types";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { deleteFromR2 } from "../lib/storage";

const admin = new Hono<{
  Bindings: Env;
  Variables: { user: User; sessionId: string };
}>();

admin.use("/*", requireAuth, requireAdmin);

// Dashboard stats
admin.get("/stats", async (c) => {
  const [users, pending, approved] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as count FROM users").first<{
      count: number;
    }>(),
    c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM uploads WHERE status = 'pending'"
    ).first<{ count: number }>(),
    c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM uploads WHERE status = 'approved'"
    ).first<{ count: number }>(),
  ]);

  return c.json({
    total_users: users?.count || 0,
    pending_uploads: pending?.count || 0,
    approved_uploads: approved?.count || 0,
  });
});

// List all users with upload counts
admin.get("/users", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.display_name, u.email, u.role,
            u.invite_token, u.invite_accepted, u.created_at,
            COUNT(up.id) as upload_count
     FROM users u
     LEFT JOIN uploads up ON u.id = up.user_id
     GROUP BY u.id
     ORDER BY u.created_at DESC`
  ).all();

  return c.json({ users: results });
});

// Delete a user
admin.delete("/users/:id", async (c) => {
  const userId = c.req.param("id");
  const deleteUploads = c.req.query("delete_uploads") === "true";

  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(userId)
    .first<User>();

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  if (user.role === "admin") {
    return c.json({ error: "Cannot delete admin" }, 400);
  }

  if (deleteUploads) {
    const { results } = await c.env.DB.prepare(
      "SELECT file_key, thumbnail_key FROM uploads WHERE user_id = ?"
    )
      .bind(userId)
      .all<{ file_key: string; thumbnail_key: string | null }>();

    const keys = results
      .flatMap((r) => [r.file_key, r.thumbnail_key])
      .filter(Boolean) as string[];

    if (keys.length > 0) {
      await deleteFromR2(c.env.BUCKET, keys);
    }
  }

  await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();

  return c.json({ ok: true });
});

// List uploads (with optional status filter)
admin.get("/uploads", async (c) => {
  const status = c.req.query("status");
  const userId = c.req.query("user_id");

  let query = `
    SELECT up.*, usr.display_name
    FROM uploads up
    JOIN users usr ON up.user_id = usr.id
  `;
  const conditions: string[] = [];
  const binds: string[] = [];

  if (status) {
    conditions.push("up.status = ?");
    binds.push(status);
  }
  if (userId) {
    conditions.push("up.user_id = ?");
    binds.push(userId);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " ORDER BY up.uploaded_at DESC";

  const stmt = c.env.DB.prepare(query);
  const { results } = await (binds.length > 0
    ? stmt.bind(...binds)
    : stmt
  ).all();

  return c.json({ uploads: results });
});

// Update upload status (approve/reject/revoke)
admin.patch("/uploads/:id", async (c) => {
  const uploadId = c.req.param("id");
  const adminUser = c.get("user");
  const { status } = await c.req.json<{
    status: "approved" | "rejected" | "pending";
  }>();

  if (!["approved", "rejected", "pending"].includes(status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  await c.env.DB.prepare(
    "UPDATE uploads SET status = ?, reviewed_at = datetime('now'), reviewed_by = ? WHERE id = ?"
  )
    .bind(status, adminUser.id, uploadId)
    .run();

  const upload = await c.env.DB.prepare("SELECT * FROM uploads WHERE id = ?")
    .bind(uploadId)
    .first();

  return c.json({ upload });
});

// Delete an upload permanently
admin.delete("/uploads/:id", async (c) => {
  const uploadId = c.req.param("id");

  const upload = await c.env.DB.prepare(
    "SELECT file_key, thumbnail_key FROM uploads WHERE id = ?"
  )
    .bind(uploadId)
    .first<{ file_key: string; thumbnail_key: string | null }>();

  if (!upload) {
    return c.json({ error: "Upload not found" }, 404);
  }

  const keys = [upload.file_key, upload.thumbnail_key].filter(
    Boolean
  ) as string[];
  await deleteFromR2(c.env.BUCKET, keys);

  await c.env.DB.prepare("DELETE FROM uploads WHERE id = ?")
    .bind(uploadId)
    .run();

  return c.json({ ok: true });
});

// Bulk actions on uploads
admin.post("/uploads/bulk", async (c) => {
  const adminUser = c.get("user");
  const { ids, action } = await c.req.json<{
    ids: string[];
    action: "approve" | "reject" | "delete";
  }>();

  if (!ids || ids.length === 0) {
    return c.json({ error: "No ids provided" }, 400);
  }

  if (action === "delete") {
    const placeholders = ids.map(() => "?").join(",");
    const { results } = await c.env.DB.prepare(
      `SELECT file_key, thumbnail_key FROM uploads WHERE id IN (${placeholders})`
    )
      .bind(...ids)
      .all<{ file_key: string; thumbnail_key: string | null }>();

    const keys = results
      .flatMap((r) => [r.file_key, r.thumbnail_key])
      .filter(Boolean) as string[];

    if (keys.length > 0) {
      await deleteFromR2(c.env.BUCKET, keys);
    }

    await c.env.DB.prepare(
      `DELETE FROM uploads WHERE id IN (${placeholders})`
    )
      .bind(...ids)
      .run();

    return c.json({ ok: true, updated: ids.length });
  }

  const statusValue = action === "approve" ? "approved" : "rejected";
  const placeholders = ids.map(() => "?").join(",");

  await c.env.DB.prepare(
    `UPDATE uploads SET status = ?, reviewed_at = datetime('now'), reviewed_by = ?
     WHERE id IN (${placeholders})`
  )
    .bind(statusValue, adminUser.id, ...ids)
    .run();

  return c.json({ ok: true, updated: ids.length });
});

// Get site settings
admin.get("/settings", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT key, value FROM site_settings"
  ).all();

  const settings: Record<string, string> = {};
  for (const row of results as Array<{ key: string; value: string }>) {
    settings[row.key] = row.value;
  }

  return c.json({ settings });
});

// Update site settings
admin.patch("/settings", async (c) => {
  const updates = await c.req.json<Record<string, string>>();

  const batch = Object.entries(updates).map(([key, value]) =>
    c.env.DB.prepare(
      "INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)"
    ).bind(key, value)
  );

  await c.env.DB.batch(batch);

  const { results } = await c.env.DB.prepare(
    "SELECT key, value FROM site_settings"
  ).all();

  const settings: Record<string, string> = {};
  for (const row of results as Array<{ key: string; value: string }>) {
    settings[row.key] = row.value;
  }

  return c.json({ settings });
});

export { admin };

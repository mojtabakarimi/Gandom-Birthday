import { Hono } from "hono";
import type { Env, User } from "../types";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { deleteFiles } from "../lib/storage";

const admin = new Hono<{
  Variables: Env & { user: User; sessionId: string };
}>();

admin.use("/*", requireAuth, requireAdmin);

admin.get("/stats", async (c) => {
  const db = c.get("db");
  const [users, pending, approved] = await Promise.all([
    db.query("SELECT COUNT(*) as count FROM users"),
    db.query("SELECT COUNT(*) as count FROM uploads WHERE status = 'pending'"),
    db.query("SELECT COUNT(*) as count FROM uploads WHERE status = 'approved'"),
  ]);

  return c.json({
    total_users: parseInt(users.rows[0].count, 10),
    pending_uploads: parseInt(pending.rows[0].count, 10),
    approved_uploads: parseInt(approved.rows[0].count, 10),
  });
});

admin.get("/users", async (c) => {
  const db = c.get("db");
  const result = await db.query(
    `SELECT u.id, u.username, u.display_name, u.email, u.role,
            u.invite_token, u.invite_accepted, u.created_at,
            COUNT(up.id)::int as upload_count
     FROM users u
     LEFT JOIN uploads up ON u.id = up.user_id
     GROUP BY u.id
     ORDER BY u.created_at DESC`
  );

  return c.json({ users: result.rows });
});

admin.delete("/users/:id", async (c) => {
  const db = c.get("db");
  const uploadDir = c.get("uploadDir");
  const userId = c.req.param("id");
  const deleteUploads = c.req.query("delete_uploads") === "true";

  const userResult = await db.query("SELECT * FROM users WHERE id = $1", [userId]);

  if (userResult.rows.length === 0) {
    return c.json({ error: "User not found" }, 404);
  }

  if (userResult.rows[0].role === "admin") {
    return c.json({ error: "Cannot delete admin" }, 400);
  }

  if (deleteUploads) {
    const uploadsResult = await db.query(
      "SELECT file_key, thumbnail_key FROM uploads WHERE user_id = $1",
      [userId]
    );

    const keys = uploadsResult.rows
      .flatMap((r: any) => [r.file_key, r.thumbnail_key])
      .filter(Boolean) as string[];

    if (keys.length > 0) {
      await deleteFiles(uploadDir, keys);
    }
  }

  await db.query("DELETE FROM users WHERE id = $1", [userId]);

  return c.json({ ok: true });
});

admin.get("/uploads", async (c) => {
  const db = c.get("db");
  const status = c.req.query("status");
  const userId = c.req.query("user_id");

  let query = `
    SELECT up.*, usr.display_name
    FROM uploads up
    JOIN users usr ON up.user_id = usr.id
  `;
  const conditions: string[] = [];
  const params: string[] = [];
  let paramIdx = 1;

  if (status) {
    conditions.push(`up.status = $${paramIdx++}`);
    params.push(status);
  }
  if (userId) {
    conditions.push(`up.user_id = $${paramIdx++}`);
    params.push(userId);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " ORDER BY up.uploaded_at DESC";

  const result = await db.query(query, params);

  return c.json({ uploads: result.rows });
});

admin.patch("/uploads/:id", async (c) => {
  const db = c.get("db");
  const uploadId = c.req.param("id");
  const adminUser = c.get("user");
  const { status } = await c.req.json<{
    status: "approved" | "rejected" | "pending";
  }>();

  if (!["approved", "rejected", "pending"].includes(status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  await db.query(
    "UPDATE uploads SET status = $1, reviewed_at = NOW(), reviewed_by = $2 WHERE id = $3",
    [status, adminUser.id, uploadId]
  );

  const result = await db.query("SELECT * FROM uploads WHERE id = $1", [uploadId]);

  return c.json({ upload: result.rows[0] });
});

admin.delete("/uploads/:id", async (c) => {
  const db = c.get("db");
  const uploadDir = c.get("uploadDir");
  const uploadId = c.req.param("id");

  const result = await db.query(
    "SELECT file_key, thumbnail_key FROM uploads WHERE id = $1",
    [uploadId]
  );

  if (result.rows.length === 0) {
    return c.json({ error: "Upload not found" }, 404);
  }

  const upload = result.rows[0];
  const keys = [upload.file_key, upload.thumbnail_key].filter(Boolean) as string[];
  await deleteFiles(uploadDir, keys);

  await db.query("DELETE FROM uploads WHERE id = $1", [uploadId]);

  return c.json({ ok: true });
});

admin.post("/uploads/bulk", async (c) => {
  const db = c.get("db");
  const uploadDir = c.get("uploadDir");
  const adminUser = c.get("user");
  const { ids, action } = await c.req.json<{
    ids: string[];
    action: "approve" | "reject" | "delete";
  }>();

  if (!ids || ids.length === 0) {
    return c.json({ error: "No ids provided" }, 400);
  }

  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");

  if (action === "delete") {
    const result = await db.query(
      `SELECT file_key, thumbnail_key FROM uploads WHERE id IN (${placeholders})`,
      ids
    );

    const keys = result.rows
      .flatMap((r: any) => [r.file_key, r.thumbnail_key])
      .filter(Boolean) as string[];

    if (keys.length > 0) {
      await deleteFiles(uploadDir, keys);
    }

    await db.query(
      `DELETE FROM uploads WHERE id IN (${placeholders})`,
      ids
    );

    return c.json({ ok: true, updated: ids.length });
  }

  const statusValue = action === "approve" ? "approved" : "rejected";
  const statusPlaceholder = `$${ids.length + 1}`;
  const reviewerPlaceholder = `$${ids.length + 2}`;

  await db.query(
    `UPDATE uploads SET status = ${statusPlaceholder}, reviewed_at = NOW(), reviewed_by = ${reviewerPlaceholder}
     WHERE id IN (${placeholders})`,
    [...ids, statusValue, adminUser.id]
  );

  return c.json({ ok: true, updated: ids.length });
});

admin.get("/settings", async (c) => {
  const db = c.get("db");
  const result = await db.query("SELECT key, value FROM site_settings");

  const settings: Record<string, string> = {};
  for (const row of result.rows) {
    settings[row.key] = row.value;
  }

  return c.json({ settings });
});

admin.patch("/settings", async (c) => {
  const db = c.get("db");
  const updates = await c.req.json<Record<string, string>>();

  for (const [key, value] of Object.entries(updates)) {
    await db.query(
      "INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
      [key, value]
    );
  }

  const result = await db.query("SELECT key, value FROM site_settings");
  const settings: Record<string, string> = {};
  for (const row of result.rows) {
    settings[row.key] = row.value;
  }

  return c.json({ settings });
});

export { admin };

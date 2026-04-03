import { Hono } from "hono";
import type { Env, User } from "../types";
import { hashPassword, generateToken, generateUUID } from "../lib/crypto";
import { requireAuth, requireAdmin } from "../middleware/auth";

const invites = new Hono<{
  Variables: Env & { user: User; sessionId: string };
}>();

invites.post("/", requireAuth, requireAdmin, async (c) => {
  const db = c.get("db");
  const { display_name, email } = await c.req.json<{
    display_name: string;
    email?: string;
  }>();

  if (!display_name) {
    return c.json({ error: "display_name is required" }, 400);
  }

  const id = generateUUID();
  const invite_token = generateToken();

  await db.query(
    "INSERT INTO users (id, display_name, email, invite_token) VALUES ($1, $2, $3, $4)",
    [id, display_name, email || null, invite_token]
  );

  return c.json({ id, display_name, invite_token }, 201);
});

invites.get("/:token", async (c) => {
  const db = c.get("db");
  const token = c.req.param("token");
  const result = await db.query(
    "SELECT id, display_name, invite_accepted FROM users WHERE invite_token = $1",
    [token]
  );

  if (result.rows.length === 0) {
    return c.json({ error: "Invite not found" }, 404);
  }

  const user = result.rows[0];
  return c.json({
    display_name: user.display_name,
    invite_accepted: !!user.invite_accepted,
  });
});

invites.post("/:token/accept", async (c) => {
  const db = c.get("db");
  const token = c.req.param("token");
  const { username, password } = await c.req.json<{
    username: string;
    password: string;
  }>();

  if (!username || !password) {
    return c.json({ error: "username and password required" }, 400);
  }

  const userResult = await db.query(
    "SELECT * FROM users WHERE invite_token = $1",
    [token]
  );

  if (userResult.rows.length === 0) {
    return c.json({ error: "Invite not found" }, 404);
  }

  const user = userResult.rows[0] as User;

  if (user.invite_accepted) {
    return c.json({ error: "Invite already accepted" }, 400);
  }

  const existing = await db.query(
    "SELECT id FROM users WHERE username = $1",
    [username]
  );

  if (existing.rows.length > 0) {
    return c.json({ error: "Username already taken" }, 409);
  }

  const password_hash = await hashPassword(password);

  await db.query(
    "UPDATE users SET username = $1, password_hash = $2, invite_accepted = true WHERE id = $3",
    [username, password_hash, user.id]
  );

  const sessionId = generateUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await db.query(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
    [sessionId, user.id, expiresAt]
  );

  const updated = await db.query("SELECT * FROM users WHERE id = $1", [user.id]);
  const { password_hash: _, ...safeUser } = updated.rows[0];

  return c.json({ user: safeUser }, 200, {
    "Set-Cookie": `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`,
  });
});

export { invites };

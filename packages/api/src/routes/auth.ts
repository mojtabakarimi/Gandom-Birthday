import { Hono } from "hono";
import type { Env, User } from "../types";
import { hashPassword, verifyPassword, generateUUID } from "../lib/crypto";
import { requireAuth } from "../middleware/auth";

const auth = new Hono<{
  Variables: Env & { user: User; sessionId: string };
}>();

auth.get("/status", async (c) => {
  const db = c.get("db");
  const result = await db.query(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  );
  return c.json({ needs_setup: result.rows.length === 0 });
});

auth.post("/setup", async (c) => {
  const db = c.get("db");
  const existing = await db.query(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  );
  if (existing.rows.length > 0) {
    return c.json({ error: "Admin already exists" }, 400);
  }

  const { username, display_name, password } = await c.req.json<{
    username: string;
    display_name: string;
    password: string;
  }>();

  if (!username || !display_name || !password) {
    return c.json({ error: "username, display_name, and password required" }, 400);
  }

  const id = generateUUID();
  const password_hash = await hashPassword(password);

  await db.query(
    "INSERT INTO users (id, username, display_name, password_hash, role, invite_accepted) VALUES ($1, $2, $3, $4, 'admin', true)",
    [id, username, display_name, password_hash]
  );

  const sessionId = generateUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await db.query(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
    [sessionId, id, expiresAt]
  );

  const userResult = await db.query("SELECT * FROM users WHERE id = $1", [id]);

  return c.json({ user: sanitizeUser(userResult.rows[0]) }, 201, {
    "Set-Cookie": `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`,
  });
});

auth.post("/login", async (c) => {
  const db = c.get("db");
  const { username, password } = await c.req.json<{
    username: string;
    password: string;
  }>();

  const result = await db.query(
    "SELECT * FROM users WHERE username = $1 AND invite_accepted = true",
    [username]
  );

  const user = result.rows[0] as User | undefined;

  if (!user || !user.password_hash) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const sessionId = generateUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await db.query(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
    [sessionId, user.id, expiresAt]
  );

  return c.json({ user: sanitizeUser(user) }, 200, {
    "Set-Cookie": `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`,
  });
});

auth.get("/me", requireAuth, (c) => {
  const user = c.get("user");
  return c.json({ user: sanitizeUser(user) });
});

auth.post("/logout", requireAuth, async (c) => {
  const db = c.get("db");
  const sessionId = c.get("sessionId");
  await db.query("DELETE FROM sessions WHERE id = $1", [sessionId]);
  return c.json({ ok: true }, 200, {
    "Set-Cookie": "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
  });
});

function sanitizeUser(user: User) {
  const { password_hash, ...safe } = user;
  return safe;
}

export { auth };

import { Hono } from "hono";
import type { Env, User } from "../types";
import { hashPassword, verifyPassword, generateUUID } from "../lib/crypto";
import { requireAuth } from "../middleware/auth";

const auth = new Hono<{
  Bindings: Env;
  Variables: { user: User; sessionId: string };
}>();

// Check if setup is needed
auth.get("/status", async (c) => {
  const admin = await c.env.DB.prepare(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  ).first();
  return c.json({ needs_setup: !admin });
});

// First-run admin setup
auth.post("/setup", async (c) => {
  const existing = await c.env.DB.prepare(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  ).first();
  if (existing) {
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

  await c.env.DB.prepare(
    "INSERT INTO users (id, username, display_name, password_hash, role, invite_accepted) VALUES (?, ?, ?, ?, 'admin', 1)"
  )
    .bind(id, username, display_name, password_hash)
    .run();

  const sessionId = generateUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await c.env.DB.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
  )
    .bind(sessionId, id, expiresAt)
    .run();

  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(id)
    .first<User>();

  return c.json({ user: sanitizeUser(user!) }, 201, {
    "Set-Cookie": `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`,
  });
});

// Login
auth.post("/login", async (c) => {
  const { username, password } = await c.req.json<{
    username: string;
    password: string;
  }>();

  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE username = ? AND invite_accepted = 1"
  )
    .bind(username)
    .first<User>();

  if (!user || !user.password_hash) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const sessionId = generateUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await c.env.DB.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
  )
    .bind(sessionId, user.id, expiresAt)
    .run();

  return c.json({ user: sanitizeUser(user) }, 200, {
    "Set-Cookie": `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`,
  });
});

// Get current user
auth.get("/me", requireAuth, (c) => {
  const user = c.get("user");
  return c.json({ user: sanitizeUser(user) });
});

// Logout
auth.post("/logout", requireAuth, async (c) => {
  const sessionId = c.get("sessionId");
  await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?")
    .bind(sessionId)
    .run();
  return c.json({ ok: true }, 200, {
    "Set-Cookie": "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
  });
});

function sanitizeUser(user: User) {
  const { password_hash, ...safe } = user;
  return safe;
}

export { auth };

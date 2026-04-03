import { Hono } from "hono";
import type { Env, User } from "../types";
import {
  hashPassword,
  generateToken,
  generateUUID,
} from "../lib/crypto";
import { requireAuth, requireAdmin } from "../middleware/auth";

const invites = new Hono<{
  Bindings: Env;
  Variables: { user: User; sessionId: string };
}>();

// Admin creates an invite
invites.post("/", requireAuth, requireAdmin, async (c) => {
  const { display_name, email } = await c.req.json<{
    display_name: string;
    email?: string;
  }>();

  if (!display_name) {
    return c.json({ error: "display_name is required" }, 400);
  }

  const id = generateUUID();
  const invite_token = generateToken();

  await c.env.DB.prepare(
    "INSERT INTO users (id, display_name, email, invite_token) VALUES (?, ?, ?, ?)"
  )
    .bind(id, display_name, email || null, invite_token)
    .run();

  return c.json({ id, display_name, invite_token }, 201);
});

// Get invite info (public — used by invite accept page)
invites.get("/:token", async (c) => {
  const token = c.req.param("token");
  const user = await c.env.DB.prepare(
    "SELECT id, display_name, invite_accepted FROM users WHERE invite_token = ?"
  )
    .bind(token)
    .first();

  if (!user) {
    return c.json({ error: "Invite not found" }, 404);
  }

  return c.json({
    display_name: user.display_name,
    invite_accepted: !!user.invite_accepted,
  });
});

// Accept invite (public — user sets username and password)
invites.post("/:token/accept", async (c) => {
  const token = c.req.param("token");
  const { username, password } = await c.req.json<{
    username: string;
    password: string;
  }>();

  if (!username || !password) {
    return c.json({ error: "username and password required" }, 400);
  }

  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE invite_token = ?"
  )
    .bind(token)
    .first<User>();

  if (!user) {
    return c.json({ error: "Invite not found" }, 404);
  }

  if (user.invite_accepted) {
    return c.json({ error: "Invite already accepted" }, 400);
  }

  // Check username uniqueness
  const existing = await c.env.DB.prepare(
    "SELECT id FROM users WHERE username = ?"
  )
    .bind(username)
    .first();

  if (existing) {
    return c.json({ error: "Username already taken" }, 409);
  }

  const password_hash = await hashPassword(password);

  await c.env.DB.prepare(
    "UPDATE users SET username = ?, password_hash = ?, invite_accepted = 1 WHERE id = ?"
  )
    .bind(username, password_hash, user.id)
    .run();

  // Auto-login
  const sessionId = generateUUID();
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  await c.env.DB.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
  )
    .bind(sessionId, user.id, expiresAt)
    .run();

  const updated = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(user.id)
    .first<User>();

  const { password_hash: _, ...safeUser } = updated!;

  return c.json({ user: safeUser }, 200, {
    "Set-Cookie": `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`,
  });
});

export { invites };

import { createMiddleware } from "hono/factory";
import type { Env, User } from "../types";

type AuthEnv = {
  Bindings: Env;
  Variables: { user: User; sessionId: string };
};

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const sessionId = getCookie(c.req.raw, "session");
  if (!sessionId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const session = await c.env.DB.prepare(
    "SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')"
  )
    .bind(sessionId)
    .first();

  if (!session) {
    return c.json({ error: "Session expired" }, 401);
  }

  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(session.user_id)
    .first<User>();

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  c.set("user", user);
  c.set("sessionId", sessionId);
  await next();
});

export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user || user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }
  await next();
});

function getCookie(request: Request, name: string): string | undefined {
  const cookies = request.headers.get("Cookie");
  if (!cookies) return undefined;
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : undefined;
}

import { createMiddleware } from "hono/factory";
import type { Env, User } from "../types";

type AuthVariables = Env & { user: User; sessionId: string };

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const sessionId = getCookie(c.req.raw, "session");
    if (!sessionId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const db = c.get("db");

    const sessionResult = await db.query(
      "SELECT * FROM sessions WHERE id = $1 AND expires_at > NOW()",
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return c.json({ error: "Session expired" }, 401);
    }

    const session = sessionResult.rows[0];

    const userResult = await db.query("SELECT * FROM users WHERE id = $1", [
      session.user_id,
    ]);

    if (userResult.rows.length === 0) {
      return c.json({ error: "User not found" }, 401);
    }

    c.set("user", userResult.rows[0] as User);
    c.set("sessionId", sessionId);
    await next();
  }
);

export const requireAdmin = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const user = c.get("user");
    if (!user || user.role !== "admin") {
      return c.json({ error: "Admin access required" }, 403);
    }
    await next();
  }
);

function getCookie(request: Request, name: string): string | undefined {
  const cookies = request.headers.get("Cookie");
  if (!cookies) return undefined;
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : undefined;
}

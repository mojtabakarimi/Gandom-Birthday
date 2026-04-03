import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { getPool } from "./db/pool";
import type { Env } from "./types";
import { auth } from "./routes/auth";
import { invites } from "./routes/invites";
import { uploads } from "./routes/uploads";
import { gallery } from "./routes/gallery";
import { admin } from "./routes/admin";
import { mkdirSync } from "fs";

const uploadDir = process.env.UPLOAD_DIR || "./uploads";
mkdirSync(uploadDir, { recursive: true });

const app = new Hono<{ Variables: Env }>();

// Inject db pool and config into context
app.use("*", async (c, next) => {
  c.set("db", getPool());
  c.set("uploadDir", uploadDir);
  c.set("corsOrigin", process.env.CORS_ORIGIN || "http://localhost:5173");
  await next();
});

app.use(
  "/api/*",
  cors({
    origin: (origin) => process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/auth", auth);
app.route("/api/invites", invites);
app.route("/api/uploads", uploads);
app.route("/api/gallery", gallery);
app.route("/api/admin", admin);

const port = parseInt(process.env.PORT || "8787", 10);
console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });

export default app;

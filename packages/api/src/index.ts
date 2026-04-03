import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { auth } from "./routes/auth";
import { invites } from "./routes/invites";
import { uploads } from "./routes/uploads";
import { gallery } from "./routes/gallery";
import { admin } from "./routes/admin";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "/api/*",
  cors({
    origin: (origin, c) => c.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/auth", auth);
app.route("/api/invites", invites);
app.route("/api/uploads", uploads);
app.route("/api/gallery", gallery);
app.route("/api/admin", admin);

export default app;

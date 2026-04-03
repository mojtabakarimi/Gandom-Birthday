import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "/api/*",
  cors({
    origin: (origin, c) => c.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.get("/api/health", (c) => c.json({ ok: true }));

export default app;

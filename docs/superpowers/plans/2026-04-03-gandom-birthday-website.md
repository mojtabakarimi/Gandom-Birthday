# Gandom Birthday Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a trilingual birthday website with animated surprise reveal, user-managed photo/video gallery, and admin approval workflow — all on Cloudflare's edge.

**Architecture:** React SPA (Vite) on Cloudflare Pages for the frontend. Hono API on Cloudflare Workers for the backend. Cloudflare D1 (SQLite) for data. Cloudflare R2 for file storage. Monorepo with `packages/web` and `packages/api`.

**Tech Stack:** React, Vite, Tailwind CSS, Framer Motion, Hono, Cloudflare Workers/D1/R2, PBKDF2 (Web Crypto API), TypeScript

---

## File Structure

```
gandom-birthday/
├── package.json                          # Monorepo root (npm workspaces)
├── packages/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── wrangler.toml                 # Worker + D1 + R2 bindings
│   │   ├── vitest.config.ts
│   │   ├── src/
│   │   │   ├── index.ts                  # Hono app entry, mounts all routes
│   │   │   ├── types.ts                  # Env bindings, shared types
│   │   │   ├── db/
│   │   │   │   └── schema.sql            # D1 migration
│   │   │   ├── lib/
│   │   │   │   ├── crypto.ts             # PBKDF2 hash/verify
│   │   │   │   └── storage.ts            # R2 upload/delete/get-url helpers
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts               # Session auth + admin guard
│   │   │   └── routes/
│   │   │       ├── auth.ts               # POST /setup, /login, /logout, /me
│   │   │       ├── invites.ts            # POST /invites, POST /invites/:token/accept
│   │   │       ├── uploads.ts            # POST /uploads, GET /uploads/mine
│   │   │       ├── gallery.ts            # GET /gallery
│   │   │       └── admin.ts              # GET/PATCH/DELETE users, uploads, settings
│   │   └── test/
│   │       ├── crypto.test.ts
│   │       ├── auth.test.ts
│   │       ├── invites.test.ts
│   │       ├── uploads.test.ts
│   │       ├── gallery.test.ts
│   │       ├── admin.test.ts
│   │       └── helpers.ts                # Test app factory with mock D1/R2
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx                  # React entry
│           ├── App.tsx                   # Router setup
│           ├── api.ts                    # Fetch wrapper for API calls
│           ├── i18n/
│           │   ├── I18nContext.tsx        # Provider + useT hook
│           │   ├── en.json
│           │   ├── fa.json
│           │   └── nb.json
│           ├── auth/
│           │   ├── AuthContext.tsx        # Auth state + useAuth hook
│           │   ├── ProtectedRoute.tsx     # Redirect to /login if not authed
│           │   └── AdminRoute.tsx         # Redirect if not admin
│           ├── pages/
│           │   ├── Home.tsx              # Birthday surprise animation
│           │   ├── Login.tsx
│           │   ├── Setup.tsx             # First-run admin setup
│           │   ├── Invite.tsx            # Accept invite page
│           │   ├── Gallery.tsx
│           │   ├── Upload.tsx
│           │   └── admin/
│           │       ├── AdminLayout.tsx    # Sidebar + outlet
│           │       ├── Dashboard.tsx
│           │       ├── Users.tsx
│           │       ├── Pending.tsx
│           │       ├── Content.tsx
│           │       └── Settings.tsx
│           └── components/
│               ├── LanguagePicker.tsx
│               ├── Lightbox.tsx
│               ├── GalleryGrid.tsx
│               ├── MediaCard.tsx
│               ├── UploadForm.tsx
│               ├── ConfettiEffect.tsx
│               ├── EnvelopeAnimation.tsx
│               ├── CardAnimation.tsx
│               └── CountdownTimer.tsx
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `packages/api/package.json`
- Create: `packages/api/tsconfig.json`
- Create: `packages/api/wrangler.toml`
- Create: `packages/api/vitest.config.ts`
- Create: `packages/api/src/index.ts`
- Create: `packages/api/src/types.ts`
- Create: `packages/web/package.json`
- Create: `packages/web/tsconfig.json`
- Create: `packages/web/vite.config.ts`
- Create: `packages/web/tailwind.config.ts`
- Create: `packages/web/index.html`
- Create: `packages/web/src/main.tsx`
- Create: `packages/web/src/App.tsx`

- [ ] **Step 1: Create root package.json with workspaces**

```json
{
  "name": "gandom-birthday",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev:api": "npm run dev -w packages/api",
    "dev:web": "npm run dev -w packages/web",
    "test:api": "npm test -w packages/api",
    "build:web": "npm run build -w packages/web"
  }
}
```

- [ ] **Step 2: Create API package**

`packages/api/package.json`:
```json
{
  "name": "gandom-api",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "test": "vitest run",
    "test:watch": "vitest",
    "deploy": "wrangler deploy",
    "db:migrate": "wrangler d1 execute gandom-db --file=src/db/schema.sql"
  },
  "dependencies": {
    "hono": "^4"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4",
    "@cloudflare/vitest-pool-workers": "^0.5",
    "vitest": "^2",
    "wrangler": "^3",
    "typescript": "^5"
  }
}
```

`packages/api/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*", "test/**/*"]
}
```

`packages/api/wrangler.toml`:
```toml
name = "gandom-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[[d1_databases]]
binding = "DB"
database_name = "gandom-db"
database_id = "placeholder-replace-after-create"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "gandom-files"

[vars]
CORS_ORIGIN = "https://gandom-birthday.pages.dev"
```

`packages/api/vitest.config.ts`:
```ts
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
      },
    },
  },
});
```

- [ ] **Step 3: Create API entry point and types**

`packages/api/src/types.ts`:
```ts
export type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
  CORS_ORIGIN: string;
};

export type User = {
  id: string;
  username: string | null;
  display_name: string;
  email: string | null;
  password_hash: string | null;
  role: "admin" | "user";
  invite_token: string | null;
  invite_accepted: number;
  created_at: string;
};

export type Session = {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
};

export type Upload = {
  id: string;
  user_id: string;
  file_key: string;
  thumbnail_key: string | null;
  media_type: "image" | "video";
  caption: string | null;
  status: "pending" | "approved" | "rejected";
  uploaded_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type SiteSettings = {
  key: string;
  value: string;
};
```

`packages/api/src/index.ts`:
```ts
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
```

- [ ] **Step 4: Create web package**

`packages/web/package.json`:
```json
{
  "name": "gandom-web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19",
    "react-dom": "^19",
    "react-router-dom": "^7",
    "framer-motion": "^11"
  },
  "devDependencies": {
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^4",
    "autoprefixer": "^10",
    "postcss": "^8",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vite": "^6"
  }
}
```

`packages/web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

`packages/web/vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
```

`packages/web/tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

`packages/web/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Happy Birthday Gandom!</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`packages/web/src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

`packages/web/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`packages/web/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 5: Install dependencies and verify**

Run: `cd packages/api && npm install && cd ../web && npm install && cd ../..`

Run: `npm run dev:api` — verify `http://localhost:8787/api/health` returns `{"ok":true}`

Run: `npm run dev:web` — verify `http://localhost:5173` shows "Home"

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: scaffold monorepo with api (Hono) and web (React+Vite) packages"
```

---

### Task 2: Database Schema

**Files:**
- Create: `packages/api/src/db/schema.sql`

- [ ] **Step 1: Write the D1 schema migration**

`packages/api/src/db/schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  invite_token TEXT UNIQUE,
  invite_accepted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_key TEXT NOT NULL,
  thumbnail_key TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default settings
INSERT OR IGNORE INTO site_settings (key, value) VALUES
  ('birthday_message_en', 'Happy Birthday, dear Gandom!'),
  ('birthday_message_fa', '!تولدت مبارک گندم عزیز'),
  ('birthday_message_nb', 'Gratulerer med dagen, kjære Gandom!'),
  ('mode', 'animation'),
  ('max_file_size_mb', '50'),
  ('max_uploads_per_user', '20');
```

- [ ] **Step 2: Run migration locally**

Run: `cd packages/api && npx wrangler d1 execute gandom-db --local --file=src/db/schema.sql`

Expected: "Executed N queries" with no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/db/schema.sql
git commit -m "feat: add D1 database schema for users, sessions, uploads, settings"
```

---

### Task 3: Crypto Utilities

**Files:**
- Create: `packages/api/src/lib/crypto.ts`
- Create: `packages/api/test/crypto.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/api/test/crypto.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, generateToken } from "../src/lib/crypto";

describe("crypto", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("mypassword123");
    expect(hash).not.toBe("mypassword123");
    expect(hash).toContain(":");

    const valid = await verifyPassword("mypassword123", hash);
    expect(valid).toBe(true);

    const invalid = await verifyPassword("wrongpassword", hash);
    expect(invalid).toBe(false);
  });

  it("generates unique tokens", () => {
    const t1 = generateToken();
    const t2 = generateToken();
    expect(t1).not.toBe(t2);
    expect(t1.length).toBeGreaterThanOrEqual(32);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && npx vitest run test/crypto.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

`packages/api/src/lib/crypto.ts`:
```ts
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(bits);
  return `${toHex(salt)}:${toHex(hashArray)}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  const salt = fromHex(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return toHex(new Uint8Array(bits)) === hashHex;
}

export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return toHex(bytes);
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && npx vitest run test/crypto.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/lib/crypto.ts packages/api/test/crypto.test.ts
git commit -m "feat: add PBKDF2 password hashing and token generation utilities"
```

---

### Task 4: Auth Middleware

**Files:**
- Create: `packages/api/src/middleware/auth.ts`
- Create: `packages/api/test/helpers.ts`

- [ ] **Step 1: Write the test helper that creates a test Hono app with mock bindings**

`packages/api/test/helpers.ts`:
```ts
import { Hono } from "hono";
import type { Env } from "../src/types";

// Minimal mock D1 for tests — stores data in memory
export function createTestApp() {
  const app = new Hono<{ Bindings: Env }>();
  return app;
}

// For integration tests, we rely on @cloudflare/vitest-pool-workers
// which provides real miniflare D1/R2 bindings via env
export function getTestEnv(env: Env) {
  return env;
}
```

- [ ] **Step 2: Write auth middleware**

`packages/api/src/middleware/auth.ts`:
```ts
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
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/middleware/auth.ts packages/api/test/helpers.ts
git commit -m "feat: add session-based auth and admin middleware"
```

---

### Task 5: Auth Routes (Setup, Login, Logout)

**Files:**
- Create: `packages/api/src/routes/auth.ts`
- Create: `packages/api/test/auth.test.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Write failing tests**

`packages/api/test/auth.test.ts`:
```ts
import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import app from "../src/index";

async function request(
  path: string,
  options?: RequestInit & { cookie?: string }
) {
  const headers = new Headers(options?.headers);
  if (options?.cookie) headers.set("Cookie", options.cookie);
  if (options?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const req = new Request(`http://localhost${path}`, { ...options, headers });
  const ctx = createExecutionContext();
  const res = await app.fetch(req, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

describe("POST /api/auth/setup", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
  });

  it("creates admin on first run", async () => {
    const res = await request("/api/auth/setup", {
      method: "POST",
      body: JSON.stringify({
        username: "dad",
        display_name: "Baba",
        password: "secure123",
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.user.role).toBe("admin");
    expect(res.headers.get("Set-Cookie")).toContain("session=");
  });

  it("rejects setup if admin already exists", async () => {
    await request("/api/auth/setup", {
      method: "POST",
      body: JSON.stringify({
        username: "dad",
        display_name: "Baba",
        password: "secure123",
      }),
    });
    const res = await request("/api/auth/setup", {
      method: "POST",
      body: JSON.stringify({
        username: "dad2",
        display_name: "Baba2",
        password: "pass",
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
    await request("/api/auth/setup", {
      method: "POST",
      body: JSON.stringify({
        username: "dad",
        display_name: "Baba",
        password: "secure123",
      }),
    });
  });

  it("logs in with correct credentials", async () => {
    const res = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "dad", password: "secure123" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Set-Cookie")).toContain("session=");
  });

  it("rejects wrong password", async () => {
    const res = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "dad", password: "wrong" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
  });

  it("returns current user when authenticated", async () => {
    const setupRes = await request("/api/auth/setup", {
      method: "POST",
      body: JSON.stringify({
        username: "dad",
        display_name: "Baba",
        password: "secure123",
      }),
    });
    const cookie = setupRes.headers.get("Set-Cookie")!.split(";")[0];

    const res = await request("/api/auth/me", { cookie });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.user.username).toBe("dad");
  });

  it("returns 401 when not authenticated", async () => {
    const res = await request("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
  });

  it("clears session", async () => {
    const setupRes = await request("/api/auth/setup", {
      method: "POST",
      body: JSON.stringify({
        username: "dad",
        display_name: "Baba",
        password: "secure123",
      }),
    });
    const cookie = setupRes.headers.get("Set-Cookie")!.split(";")[0];

    const logoutRes = await request("/api/auth/logout", {
      method: "POST",
      cookie,
    });
    expect(logoutRes.status).toBe(200);

    const meRes = await request("/api/auth/me", { cookie });
    expect(meRes.status).toBe(401);
  });
});

describe("GET /api/auth/status", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
  });

  it("returns needs_setup when no admin exists", async () => {
    const res = await request("/api/auth/status");
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.needs_setup).toBe(true);
  });

  it("returns needs_setup false after setup", async () => {
    await request("/api/auth/setup", {
      method: "POST",
      body: JSON.stringify({
        username: "dad",
        display_name: "Baba",
        password: "secure123",
      }),
    });
    const res = await request("/api/auth/status");
    const data = await res.json() as any;
    expect(data.needs_setup).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/api && npx vitest run test/auth.test.ts`

Expected: FAIL — routes not defined.

- [ ] **Step 3: Write auth routes**

`packages/api/src/routes/auth.ts`:
```ts
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
```

- [ ] **Step 4: Mount auth routes in index.ts**

Replace `packages/api/src/index.ts`:
```ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { auth } from "./routes/auth";

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

export default app;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/api && npx vitest run test/auth.test.ts`

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/auth.ts packages/api/src/index.ts packages/api/test/auth.test.ts
git commit -m "feat: add auth routes — setup, login, logout, me, status"
```

---

### Task 6: Invite Routes

**Files:**
- Create: `packages/api/src/routes/invites.ts`
- Create: `packages/api/test/invites.test.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Write failing tests**

`packages/api/test/invites.test.ts`:
```ts
import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import app from "../src/index";

async function request(
  path: string,
  options?: RequestInit & { cookie?: string }
) {
  const headers = new Headers(options?.headers);
  if (options?.cookie) headers.set("Cookie", options.cookie);
  if (options?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const req = new Request(`http://localhost${path}`, { ...options, headers });
  const ctx = createExecutionContext();
  const res = await app.fetch(req, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

let adminCookie: string;

async function setupAdmin() {
  const res = await request("/api/auth/setup", {
    method: "POST",
    body: JSON.stringify({
      username: "dad",
      display_name: "Baba",
      password: "secure123",
    }),
  });
  adminCookie = res.headers.get("Set-Cookie")!.split(";")[0];
}

describe("POST /api/invites", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
    await setupAdmin();
  });

  it("admin creates an invite", async () => {
    const res = await request("/api/invites", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({ display_name: "Uncle Ali" }),
    });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.invite_token).toBeDefined();
    expect(data.display_name).toBe("Uncle Ali");
  });

  it("non-admin cannot create invite", async () => {
    // Create and accept an invite to get a user cookie
    const inviteRes = await request("/api/invites", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({ display_name: "User" }),
    });
    const { invite_token } = await inviteRes.json() as any;

    const acceptRes = await request(`/api/invites/${invite_token}/accept`, {
      method: "POST",
      body: JSON.stringify({ username: "user1", password: "pass123" }),
    });
    const userCookie = acceptRes.headers.get("Set-Cookie")!.split(";")[0];

    const res = await request("/api/invites", {
      method: "POST",
      cookie: userCookie,
      body: JSON.stringify({ display_name: "Someone" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/invites/:token", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
    await setupAdmin();
  });

  it("returns invite info for valid token", async () => {
    const createRes = await request("/api/invites", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({ display_name: "Aunt Sara" }),
    });
    const { invite_token } = await createRes.json() as any;

    const res = await request(`/api/invites/${invite_token}`);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.display_name).toBe("Aunt Sara");
  });

  it("returns 404 for invalid token", async () => {
    const res = await request("/api/invites/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/invites/:token/accept", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
    await setupAdmin();
  });

  it("accepts invite and sets username/password", async () => {
    const createRes = await request("/api/invites", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({ display_name: "Cousin Maryam" }),
    });
    const { invite_token } = await createRes.json() as any;

    const res = await request(`/api/invites/${invite_token}/accept`, {
      method: "POST",
      body: JSON.stringify({ username: "maryam", password: "pass123" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.user.username).toBe("maryam");
    expect(res.headers.get("Set-Cookie")).toContain("session=");
  });

  it("rejects already-accepted invite", async () => {
    const createRes = await request("/api/invites", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({ display_name: "Cousin Maryam" }),
    });
    const { invite_token } = await createRes.json() as any;

    await request(`/api/invites/${invite_token}/accept`, {
      method: "POST",
      body: JSON.stringify({ username: "maryam", password: "pass123" }),
    });

    const res = await request(`/api/invites/${invite_token}/accept`, {
      method: "POST",
      body: JSON.stringify({ username: "maryam2", password: "pass456" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate username", async () => {
    const inv1 = await request("/api/invites", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({ display_name: "User1" }),
    });
    const { invite_token: t1 } = await inv1.json() as any;
    await request(`/api/invites/${t1}/accept`, {
      method: "POST",
      body: JSON.stringify({ username: "samename", password: "pass123" }),
    });

    const inv2 = await request("/api/invites", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({ display_name: "User2" }),
    });
    const { invite_token: t2 } = await inv2.json() as any;
    const res = await request(`/api/invites/${t2}/accept`, {
      method: "POST",
      body: JSON.stringify({ username: "samename", password: "pass456" }),
    });
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/api && npx vitest run test/invites.test.ts`

Expected: FAIL — routes not defined.

- [ ] **Step 3: Write invite routes**

`packages/api/src/routes/invites.ts`:
```ts
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
```

- [ ] **Step 4: Mount invites in index.ts**

Add to `packages/api/src/index.ts`:
```ts
import { invites } from "./routes/invites";
// ... after existing routes
app.route("/api/invites", invites);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/api && npx vitest run test/invites.test.ts`

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/invites.ts packages/api/test/invites.test.ts packages/api/src/index.ts
git commit -m "feat: add invite routes — create, view, accept"
```

---

### Task 7: R2 Storage Helpers

**Files:**
- Create: `packages/api/src/lib/storage.ts`

- [ ] **Step 1: Write storage helpers**

`packages/api/src/lib/storage.ts`:
```ts
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export type MediaType = "image" | "video";

export function validateFile(
  contentType: string,
  size: number
): { valid: true; mediaType: MediaType } | { valid: false; error: string } {
  const isImage = ALLOWED_IMAGE_TYPES.includes(contentType);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(contentType);

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: `Unsupported file type: ${contentType}. Allowed: JPEG, PNG, WebP, HEIC, MP4, MOV`,
    };
  }

  if (isImage && size > MAX_IMAGE_SIZE) {
    return { valid: false, error: "Image must be under 10MB" };
  }

  if (isVideo && size > MAX_VIDEO_SIZE) {
    return { valid: false, error: "Video must be under 50MB" };
  }

  return { valid: true, mediaType: isImage ? "image" : "video" };
}

export async function uploadToR2(
  bucket: R2Bucket,
  key: string,
  body: ReadableStream | ArrayBuffer,
  contentType: string
): Promise<void> {
  await bucket.put(key, body, {
    httpMetadata: { contentType },
  });
}

export async function deleteFromR2(
  bucket: R2Bucket,
  keys: string[]
): Promise<void> {
  await bucket.delete(keys);
}

export function getFileExtension(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
  };
  return map[contentType] || "bin";
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/lib/storage.ts
git commit -m "feat: add R2 storage helpers with file validation"
```

---

### Task 8: Upload Routes

**Files:**
- Create: `packages/api/src/routes/uploads.ts`
- Create: `packages/api/test/uploads.test.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Write failing tests**

`packages/api/test/uploads.test.ts`:
```ts
import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import app from "../src/index";

async function request(
  path: string,
  options?: RequestInit & { cookie?: string }
) {
  const headers = new Headers(options?.headers);
  if (options?.cookie) headers.set("Cookie", options.cookie);
  if (options?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const req = new Request(`http://localhost${path}`, { ...options, headers });
  const ctx = createExecutionContext();
  const res = await app.fetch(req, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

let adminCookie: string;
let userCookie: string;

async function setupUsers() {
  const setupRes = await request("/api/auth/setup", {
    method: "POST",
    body: JSON.stringify({
      username: "dad",
      display_name: "Baba",
      password: "secure123",
    }),
  });
  adminCookie = setupRes.headers.get("Set-Cookie")!.split(";")[0];

  const invRes = await request("/api/invites", {
    method: "POST",
    cookie: adminCookie,
    body: JSON.stringify({ display_name: "Uncle" }),
  });
  const { invite_token } = await invRes.json() as any;

  const acceptRes = await request(`/api/invites/${invite_token}/accept`, {
    method: "POST",
    body: JSON.stringify({ username: "uncle", password: "pass123" }),
  });
  userCookie = acceptRes.headers.get("Set-Cookie")!.split(";")[0];
}

describe("POST /api/uploads", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
    await setupUsers();
  });

  it("uploads an image with caption", async () => {
    const formData = new FormData();
    const blob = new Blob(["fake-image-data"], { type: "image/jpeg" });
    formData.append("file", blob, "photo.jpg");
    formData.append("caption", "Happy birthday!");

    const headers = new Headers();
    headers.set("Cookie", userCookie);

    const req = new Request("http://localhost/api/uploads", {
      method: "POST",
      body: formData,
      headers,
    });
    const ctx = createExecutionContext();
    const res = await app.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.upload.status).toBe("pending");
    expect(data.upload.caption).toBe("Happy birthday!");
    expect(data.upload.media_type).toBe("image");
  });

  it("rejects unauthenticated upload", async () => {
    const formData = new FormData();
    const blob = new Blob(["data"], { type: "image/jpeg" });
    formData.append("file", blob, "photo.jpg");

    const req = new Request("http://localhost/api/uploads", {
      method: "POST",
      body: formData,
    });
    const ctx = createExecutionContext();
    const res = await app.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(401);
  });
});

describe("GET /api/uploads/mine", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
    await setupUsers();
  });

  it("returns only the current user uploads", async () => {
    // Upload a file first
    const formData = new FormData();
    const blob = new Blob(["fake"], { type: "image/jpeg" });
    formData.append("file", blob, "photo.jpg");

    const headers = new Headers();
    headers.set("Cookie", userCookie);
    const req = new Request("http://localhost/api/uploads", {
      method: "POST",
      body: formData,
      headers,
    });
    const ctx = createExecutionContext();
    await app.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    const res = await request("/api/uploads/mine", { cookie: userCookie });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.uploads.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/api && npx vitest run test/uploads.test.ts`

Expected: FAIL — routes not defined.

- [ ] **Step 3: Write upload routes**

`packages/api/src/routes/uploads.ts`:
```ts
import { Hono } from "hono";
import type { Env, User } from "../types";
import { generateUUID } from "../lib/crypto";
import {
  validateFile,
  uploadToR2,
  getFileExtension,
} from "../lib/storage";
import { requireAuth } from "../middleware/auth";

const uploads = new Hono<{
  Bindings: Env;
  Variables: { user: User; sessionId: string };
}>();

// Upload a file
uploads.post("/", requireAuth, async (c) => {
  const user = c.get("user");

  // Check upload limit
  const settings = await c.env.DB.prepare(
    "SELECT value FROM site_settings WHERE key = 'max_uploads_per_user'"
  ).first<{ value: string }>();
  const maxUploads = parseInt(settings?.value || "20", 10);

  const countResult = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM uploads WHERE user_id = ?"
  )
    .bind(user.id)
    .first<{ count: number }>();

  if ((countResult?.count || 0) >= maxUploads) {
    return c.json({ error: `Upload limit reached (${maxUploads})` }, 400);
  }

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  const caption = (formData.get("caption") as string) || null;

  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  const validation = validateFile(file.type, file.size);
  if (!validation.valid) {
    return c.json({ error: validation.error }, 400);
  }

  const uploadId = generateUUID();
  const ext = getFileExtension(file.type);
  const fileKey = `uploads/${user.id}/${uploadId}.${ext}`;

  await uploadToR2(
    c.env.BUCKET,
    fileKey,
    await file.arrayBuffer(),
    file.type
  );

  await c.env.DB.prepare(
    `INSERT INTO uploads (id, user_id, file_key, media_type, caption, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`
  )
    .bind(uploadId, user.id, fileKey, validation.mediaType, caption)
    .run();

  const upload = await c.env.DB.prepare("SELECT * FROM uploads WHERE id = ?")
    .bind(uploadId)
    .first();

  return c.json({ upload }, 201);
});

// Get current user's uploads
uploads.get("/mine", requireAuth, async (c) => {
  const user = c.get("user");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM uploads WHERE user_id = ? ORDER BY uploaded_at DESC"
  )
    .bind(user.id)
    .all();

  return c.json({ uploads: results });
});

export { uploads };
```

- [ ] **Step 4: Mount uploads in index.ts**

Add to `packages/api/src/index.ts`:
```ts
import { uploads } from "./routes/uploads";
// ... after existing routes
app.route("/api/uploads", uploads);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/api && npx vitest run test/uploads.test.ts`

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/uploads.ts packages/api/test/uploads.test.ts packages/api/src/index.ts
git commit -m "feat: add upload routes with file validation and R2 storage"
```

---

### Task 9: Gallery Route

**Files:**
- Create: `packages/api/src/routes/gallery.ts`
- Create: `packages/api/test/gallery.test.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Write failing tests**

`packages/api/test/gallery.test.ts`:
```ts
import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import app from "../src/index";

async function request(
  path: string,
  options?: RequestInit & { cookie?: string }
) {
  const headers = new Headers(options?.headers);
  if (options?.cookie) headers.set("Cookie", options.cookie);
  if (options?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const req = new Request(`http://localhost${path}`, { ...options, headers });
  const ctx = createExecutionContext();
  const res = await app.fetch(req, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

let adminCookie: string;
let userCookie: string;

async function setupAndUpload() {
  const setupRes = await request("/api/auth/setup", {
    method: "POST",
    body: JSON.stringify({
      username: "dad",
      display_name: "Baba",
      password: "secure123",
    }),
  });
  adminCookie = setupRes.headers.get("Set-Cookie")!.split(";")[0];

  const invRes = await request("/api/invites", {
    method: "POST",
    cookie: adminCookie,
    body: JSON.stringify({ display_name: "Uncle" }),
  });
  const { invite_token } = await invRes.json() as any;
  const acceptRes = await request(`/api/invites/${invite_token}/accept`, {
    method: "POST",
    body: JSON.stringify({ username: "uncle", password: "pass123" }),
  });
  userCookie = acceptRes.headers.get("Set-Cookie")!.split(";")[0];

  // Upload a file
  const formData = new FormData();
  formData.append("file", new Blob(["img"], { type: "image/jpeg" }), "p.jpg");
  formData.append("caption", "A wish");
  const headers = new Headers();
  headers.set("Cookie", userCookie);
  const uploadReq = new Request("http://localhost/api/uploads", {
    method: "POST",
    body: formData,
    headers,
  });
  const ctx = createExecutionContext();
  const uploadRes = await app.fetch(uploadReq, env, ctx);
  await waitOnExecutionContext(ctx);
  const { upload } = await uploadRes.json() as any;

  // Approve it
  await request(`/api/admin/uploads/${upload.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: JSON.stringify({ status: "approved" }),
  });
}

describe("GET /api/gallery", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
    await setupAndUpload();
  });

  it("returns approved uploads with uploader name", async () => {
    const res = await request("/api/gallery", { cookie: userCookie });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.items.length).toBe(1);
    expect(data.items[0].caption).toBe("A wish");
    expect(data.items[0].display_name).toBe("Uncle");
  });

  it("requires authentication", async () => {
    const res = await request("/api/gallery");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/gallery/settings", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users; DELETE FROM site_settings;"
    );
    // Re-insert defaults
    await env.DB.exec(`
      INSERT OR IGNORE INTO site_settings (key, value) VALUES
        ('birthday_message_en', 'Happy Birthday, dear Gandom!'),
        ('birthday_message_fa', '!تولدت مبارک گندم عزیز'),
        ('birthday_message_nb', 'Gratulerer med dagen, kjære Gandom!'),
        ('mode', 'animation'),
        ('max_file_size_mb', '50'),
        ('max_uploads_per_user', '20');
    `);
  });

  it("returns public site settings (no auth required)", async () => {
    const res = await request("/api/gallery/settings");
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.settings.mode).toBe("animation");
    expect(data.settings.birthday_message_en).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/api && npx vitest run test/gallery.test.ts`

Expected: FAIL — routes not defined.

- [ ] **Step 3: Write gallery routes**

`packages/api/src/routes/gallery.ts`:
```ts
import { Hono } from "hono";
import type { Env, User } from "../types";
import { requireAuth } from "../middleware/auth";

const gallery = new Hono<{
  Bindings: Env;
  Variables: { user: User; sessionId: string };
}>();

// Get approved gallery items
gallery.get("/", requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.file_key, u.thumbnail_key, u.media_type, u.caption,
            u.uploaded_at, usr.display_name
     FROM uploads u
     JOIN users usr ON u.user_id = usr.id
     WHERE u.status = 'approved'
     ORDER BY u.uploaded_at DESC`
  ).all();

  return c.json({ items: results });
});

// Get public site settings (for birthday animation page)
gallery.get("/settings", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT key, value FROM site_settings"
  ).all();

  const settings: Record<string, string> = {};
  for (const row of results as Array<{ key: string; value: string }>) {
    settings[row.key] = row.value;
  }

  return c.json({ settings });
});

// Get file from R2 (serves images/videos)
gallery.get("/file/:key{.+}", requireAuth, async (c) => {
  const key = c.req.param("key");
  const object = await c.env.BUCKET.get(key);

  if (!object) {
    return c.json({ error: "File not found" }, 404);
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    object.httpMetadata?.contentType || "application/octet-stream"
  );
  headers.set("Cache-Control", "public, max-age=31536000");

  return new Response(object.body, { headers });
});

export { gallery };
```

- [ ] **Step 4: Mount gallery in index.ts**

Add to `packages/api/src/index.ts`:
```ts
import { gallery } from "./routes/gallery";
// ... after existing routes
app.route("/api/gallery", gallery);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/api && npx vitest run test/gallery.test.ts`

Expected: All tests PASS (after admin routes are added in Task 10 — run these after Task 10).

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/gallery.ts packages/api/test/gallery.test.ts packages/api/src/index.ts
git commit -m "feat: add gallery routes — approved items, settings, file serving"
```

---

### Task 10: Admin Routes

**Files:**
- Create: `packages/api/src/routes/admin.ts`
- Create: `packages/api/test/admin.test.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Write failing tests**

`packages/api/test/admin.test.ts`:
```ts
import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import app from "../src/index";

async function request(
  path: string,
  options?: RequestInit & { cookie?: string }
) {
  const headers = new Headers(options?.headers);
  if (options?.cookie) headers.set("Cookie", options.cookie);
  if (options?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const req = new Request(`http://localhost${path}`, { ...options, headers });
  const ctx = createExecutionContext();
  const res = await app.fetch(req, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

let adminCookie: string;

async function setupAdmin() {
  const res = await request("/api/auth/setup", {
    method: "POST",
    body: JSON.stringify({
      username: "dad",
      display_name: "Baba",
      password: "secure123",
    }),
  });
  adminCookie = res.headers.get("Set-Cookie")!.split(";")[0];
}

describe("GET /api/admin/stats", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
    await setupAdmin();
  });

  it("returns dashboard stats", async () => {
    const res = await request("/api/admin/stats", { cookie: adminCookie });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.total_users).toBeDefined();
    expect(data.pending_uploads).toBeDefined();
    expect(data.approved_uploads).toBeDefined();
  });
});

describe("GET /api/admin/users", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
    await setupAdmin();
  });

  it("lists all users with upload counts", async () => {
    const res = await request("/api/admin/users", { cookie: adminCookie });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.users.length).toBe(1);
    expect(data.users[0].username).toBe("dad");
  });
});

describe("DELETE /api/admin/users/:id", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
    await setupAdmin();
  });

  it("deletes a user and their uploads", async () => {
    // Create a user
    const invRes = await request("/api/invites", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({ display_name: "ToDelete" }),
    });
    const { invite_token, id: userId } = await invRes.json() as any;

    const res = await request(`/api/admin/users/${userId}?delete_uploads=true`, {
      method: "DELETE",
      cookie: adminCookie,
    });
    expect(res.status).toBe(200);

    // Verify deleted
    const usersRes = await request("/api/admin/users", { cookie: adminCookie });
    const data = await usersRes.json() as any;
    expect(data.users.length).toBe(1); // Only admin remains
  });
});

describe("PATCH /api/admin/uploads/:id", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
    await setupAdmin();
  });

  it("approves an upload", async () => {
    // Create user and upload
    const invRes = await request("/api/invites", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({ display_name: "Uploader" }),
    });
    const { invite_token } = await invRes.json() as any;
    const acceptRes = await request(`/api/invites/${invite_token}/accept`, {
      method: "POST",
      body: JSON.stringify({ username: "uploader", password: "pass" }),
    });
    const userCookie = acceptRes.headers.get("Set-Cookie")!.split(";")[0];

    const formData = new FormData();
    formData.append(
      "file",
      new Blob(["img"], { type: "image/jpeg" }),
      "p.jpg"
    );
    const headers = new Headers();
    headers.set("Cookie", userCookie);
    const uploadReq = new Request("http://localhost/api/uploads", {
      method: "POST",
      body: formData,
      headers,
    });
    const ctx = createExecutionContext();
    const uploadRes = await app.fetch(uploadReq, env, ctx);
    await waitOnExecutionContext(ctx);
    const { upload } = await uploadRes.json() as any;

    // Approve
    const res = await request(`/api/admin/uploads/${upload.id}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: JSON.stringify({ status: "approved" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.upload.status).toBe("approved");
  });
});

describe("DELETE /api/admin/uploads/:id", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
    await setupAdmin();
  });

  it("permanently deletes an upload", async () => {
    // Seed an upload record directly
    await env.DB.prepare(
      `INSERT INTO uploads (id, user_id, file_key, media_type, status)
       VALUES ('u1', (SELECT id FROM users LIMIT 1), 'uploads/test.jpg', 'image', 'pending')`
    ).run();

    const res = await request("/api/admin/uploads/u1", {
      method: "DELETE",
      cookie: adminCookie,
    });
    expect(res.status).toBe(200);
  });
});

describe("GET /api/admin/uploads", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
    await setupAdmin();
  });

  it("lists uploads with optional status filter", async () => {
    const res = await request("/api/admin/uploads?status=pending", {
      cookie: adminCookie,
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(Array.isArray(data.uploads)).toBe(true);
  });

  it("lists all uploads without filter", async () => {
    const res = await request("/api/admin/uploads", { cookie: adminCookie });
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/admin/settings", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
    await setupAdmin();
  });

  it("updates site settings", async () => {
    const res = await request("/api/admin/settings", {
      method: "PATCH",
      cookie: adminCookie,
      body: JSON.stringify({
        birthday_message_en: "New message!",
        mode: "countdown",
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.settings.birthday_message_en).toBe("New message!");
    expect(data.settings.mode).toBe("countdown");
  });
});

describe("POST /api/admin/uploads/bulk", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
    await setupAdmin();
  });

  it("bulk approves uploads", async () => {
    const adminId = (
      await env.DB.prepare("SELECT id FROM users LIMIT 1").first<{
        id: string;
      }>()
    )!.id;

    await env.DB.exec(`
      INSERT INTO uploads (id, user_id, file_key, media_type, status)
      VALUES ('b1', '${adminId}', 'f1.jpg', 'image', 'pending'),
             ('b2', '${adminId}', 'f2.jpg', 'image', 'pending');
    `);

    const res = await request("/api/admin/uploads/bulk", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({
        ids: ["b1", "b2"],
        action: "approve",
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.updated).toBe(2);
  });

  it("bulk deletes uploads", async () => {
    const adminId = (
      await env.DB.prepare("SELECT id FROM users LIMIT 1").first<{
        id: string;
      }>()
    )!.id;

    await env.DB.exec(`
      INSERT INTO uploads (id, user_id, file_key, media_type, status)
      VALUES ('d1', '${adminId}', 'f3.jpg', 'image', 'pending'),
             ('d2', '${adminId}', 'f4.jpg', 'image', 'rejected');
    `);

    const res = await request("/api/admin/uploads/bulk", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({
        ids: ["d1", "d2"],
        action: "delete",
      }),
    });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/api && npx vitest run test/admin.test.ts`

Expected: FAIL — routes not defined.

- [ ] **Step 3: Write admin routes**

`packages/api/src/routes/admin.ts`:
```ts
import { Hono } from "hono";
import type { Env, User, Upload } from "../types";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { deleteFromR2 } from "../lib/storage";

const admin = new Hono<{
  Bindings: Env;
  Variables: { user: User; sessionId: string };
}>();

admin.use("/*", requireAuth, requireAdmin);

// Dashboard stats
admin.get("/stats", async (c) => {
  const [users, pending, approved] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as count FROM users").first<{
      count: number;
    }>(),
    c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM uploads WHERE status = 'pending'"
    ).first<{ count: number }>(),
    c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM uploads WHERE status = 'approved'"
    ).first<{ count: number }>(),
  ]);

  return c.json({
    total_users: users?.count || 0,
    pending_uploads: pending?.count || 0,
    approved_uploads: approved?.count || 0,
  });
});

// List all users with upload counts
admin.get("/users", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.display_name, u.email, u.role,
            u.invite_token, u.invite_accepted, u.created_at,
            COUNT(up.id) as upload_count
     FROM users u
     LEFT JOIN uploads up ON u.id = up.user_id
     GROUP BY u.id
     ORDER BY u.created_at DESC`
  ).all();

  return c.json({ users: results });
});

// Delete a user
admin.delete("/users/:id", async (c) => {
  const userId = c.req.param("id");
  const deleteUploads = c.req.query("delete_uploads") === "true";

  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(userId)
    .first<User>();

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  if (user.role === "admin") {
    return c.json({ error: "Cannot delete admin" }, 400);
  }

  if (deleteUploads) {
    const { results } = await c.env.DB.prepare(
      "SELECT file_key, thumbnail_key FROM uploads WHERE user_id = ?"
    )
      .bind(userId)
      .all<{ file_key: string; thumbnail_key: string | null }>();

    const keys = results
      .flatMap((r) => [r.file_key, r.thumbnail_key])
      .filter(Boolean) as string[];

    if (keys.length > 0) {
      await deleteFromR2(c.env.BUCKET, keys);
    }
  }

  // CASCADE handles sessions and uploads in DB
  await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();

  return c.json({ ok: true });
});

// List uploads (with optional status filter)
admin.get("/uploads", async (c) => {
  const status = c.req.query("status");
  const userId = c.req.query("user_id");

  let query = `
    SELECT up.*, usr.display_name
    FROM uploads up
    JOIN users usr ON up.user_id = usr.id
  `;
  const conditions: string[] = [];
  const binds: string[] = [];

  if (status) {
    conditions.push("up.status = ?");
    binds.push(status);
  }
  if (userId) {
    conditions.push("up.user_id = ?");
    binds.push(userId);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " ORDER BY up.uploaded_at DESC";

  const stmt = c.env.DB.prepare(query);
  const { results } = await (binds.length > 0
    ? stmt.bind(...binds)
    : stmt
  ).all();

  return c.json({ uploads: results });
});

// Update upload status (approve/reject/revoke)
admin.patch("/uploads/:id", async (c) => {
  const uploadId = c.req.param("id");
  const adminUser = c.get("user");
  const { status } = await c.req.json<{
    status: "approved" | "rejected" | "pending";
  }>();

  if (!["approved", "rejected", "pending"].includes(status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  await c.env.DB.prepare(
    "UPDATE uploads SET status = ?, reviewed_at = datetime('now'), reviewed_by = ? WHERE id = ?"
  )
    .bind(status, adminUser.id, uploadId)
    .run();

  const upload = await c.env.DB.prepare("SELECT * FROM uploads WHERE id = ?")
    .bind(uploadId)
    .first();

  return c.json({ upload });
});

// Delete an upload permanently
admin.delete("/uploads/:id", async (c) => {
  const uploadId = c.req.param("id");

  const upload = await c.env.DB.prepare(
    "SELECT file_key, thumbnail_key FROM uploads WHERE id = ?"
  )
    .bind(uploadId)
    .first<{ file_key: string; thumbnail_key: string | null }>();

  if (!upload) {
    return c.json({ error: "Upload not found" }, 404);
  }

  const keys = [upload.file_key, upload.thumbnail_key].filter(
    Boolean
  ) as string[];
  await deleteFromR2(c.env.BUCKET, keys);

  await c.env.DB.prepare("DELETE FROM uploads WHERE id = ?")
    .bind(uploadId)
    .run();

  return c.json({ ok: true });
});

// Bulk actions on uploads
admin.post("/uploads/bulk", async (c) => {
  const adminUser = c.get("user");
  const { ids, action } = await c.req.json<{
    ids: string[];
    action: "approve" | "reject" | "delete";
  }>();

  if (!ids || ids.length === 0) {
    return c.json({ error: "No ids provided" }, 400);
  }

  if (action === "delete") {
    const placeholders = ids.map(() => "?").join(",");
    const { results } = await c.env.DB.prepare(
      `SELECT file_key, thumbnail_key FROM uploads WHERE id IN (${placeholders})`
    )
      .bind(...ids)
      .all<{ file_key: string; thumbnail_key: string | null }>();

    const keys = results
      .flatMap((r) => [r.file_key, r.thumbnail_key])
      .filter(Boolean) as string[];

    if (keys.length > 0) {
      await deleteFromR2(c.env.BUCKET, keys);
    }

    await c.env.DB.prepare(
      `DELETE FROM uploads WHERE id IN (${placeholders})`
    )
      .bind(...ids)
      .run();

    return c.json({ ok: true, updated: ids.length });
  }

  const status = action === "approve" ? "approved" : "rejected";
  const placeholders = ids.map(() => "?").join(",");

  await c.env.DB.prepare(
    `UPDATE uploads SET status = ?, reviewed_at = datetime('now'), reviewed_by = ?
     WHERE id IN (${placeholders})`
  )
    .bind(status, adminUser.id, ...ids)
    .run();

  return c.json({ ok: true, updated: ids.length });
});

// Get/update site settings
admin.get("/settings", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT key, value FROM site_settings"
  ).all();

  const settings: Record<string, string> = {};
  for (const row of results as Array<{ key: string; value: string }>) {
    settings[row.key] = row.value;
  }

  return c.json({ settings });
});

admin.patch("/settings", async (c) => {
  const updates = await c.req.json<Record<string, string>>();

  const batch = Object.entries(updates).map(([key, value]) =>
    c.env.DB.prepare(
      "INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)"
    ).bind(key, value)
  );

  await c.env.DB.batch(batch);

  // Return updated settings
  const { results } = await c.env.DB.prepare(
    "SELECT key, value FROM site_settings"
  ).all();

  const settings: Record<string, string> = {};
  for (const row of results as Array<{ key: string; value: string }>) {
    settings[row.key] = row.value;
  }

  return c.json({ settings });
});

export { admin };
```

- [ ] **Step 4: Mount admin routes in index.ts**

Final `packages/api/src/index.ts`:
```ts
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
```

- [ ] **Step 5: Run all API tests**

Run: `cd packages/api && npx vitest run`

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/admin.ts packages/api/test/admin.test.ts packages/api/src/index.ts
git commit -m "feat: add admin routes — stats, user mgmt, upload approval, bulk ops, settings"
```

---

### Task 11: Frontend — API Client + i18n + Auth Context

**Files:**
- Create: `packages/web/src/api.ts`
- Create: `packages/web/src/i18n/en.json`
- Create: `packages/web/src/i18n/fa.json`
- Create: `packages/web/src/i18n/nb.json`
- Create: `packages/web/src/i18n/I18nContext.tsx`
- Create: `packages/web/src/auth/AuthContext.tsx`
- Create: `packages/web/src/auth/ProtectedRoute.tsx`
- Create: `packages/web/src/auth/AdminRoute.tsx`

- [ ] **Step 1: Create API client**

`packages/web/src/api.ts`:
```ts
const BASE = import.meta.env.VITE_API_URL || "";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (data as any).error || "Request failed");
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const api = {
  auth: {
    status: () => request<{ needs_setup: boolean }>("/api/auth/status"),
    setup: (data: { username: string; display_name: string; password: string }) =>
      request<{ user: any }>("/api/auth/setup", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    login: (data: { username: string; password: string }) =>
      request<{ user: any }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    logout: () =>
      request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
    me: () => request<{ user: any }>("/api/auth/me"),
  },
  invites: {
    get: (token: string) =>
      request<{ display_name: string; invite_accepted: boolean }>(
        `/api/invites/${token}`
      ),
    accept: (token: string, data: { username: string; password: string }) =>
      request<{ user: any }>(`/api/invites/${token}/accept`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  gallery: {
    list: () => request<{ items: any[] }>("/api/gallery"),
    settings: () => request<{ settings: Record<string, string> }>("/api/gallery/settings"),
    fileUrl: (key: string) => `${BASE}/api/gallery/file/${key}`,
  },
  uploads: {
    create: (formData: FormData) =>
      request<{ upload: any }>("/api/uploads", {
        method: "POST",
        body: formData,
      }),
    mine: () => request<{ uploads: any[] }>("/api/uploads/mine"),
  },
  admin: {
    stats: () => request<any>("/api/admin/stats"),
    users: () => request<{ users: any[] }>("/api/admin/users"),
    deleteUser: (id: string, deleteUploads: boolean) =>
      request<{ ok: boolean }>(
        `/api/admin/users/${id}?delete_uploads=${deleteUploads}`,
        { method: "DELETE" }
      ),
    createInvite: (data: { display_name: string; email?: string }) =>
      request<{ id: string; display_name: string; invite_token: string }>(
        "/api/invites",
        { method: "POST", body: JSON.stringify(data) }
      ),
    uploads: (params?: { status?: string; user_id?: string }) => {
      const qs = new URLSearchParams(params as any).toString();
      return request<{ uploads: any[] }>(
        `/api/admin/uploads${qs ? `?${qs}` : ""}`
      );
    },
    updateUpload: (id: string, status: string) =>
      request<{ upload: any }>(`/api/admin/uploads/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    deleteUpload: (id: string) =>
      request<{ ok: boolean }>(`/api/admin/uploads/${id}`, {
        method: "DELETE",
      }),
    bulkAction: (ids: string[], action: string) =>
      request<{ ok: boolean; updated: number }>("/api/admin/uploads/bulk", {
        method: "POST",
        body: JSON.stringify({ ids, action }),
      }),
    settings: () => request<{ settings: Record<string, string> }>("/api/admin/settings"),
    updateSettings: (data: Record<string, string>) =>
      request<{ settings: Record<string, string> }>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
};
```

- [ ] **Step 2: Create translation files**

`packages/web/src/i18n/en.json`:
```json
{
  "lang_name": "English",
  "birthday_greeting": "Happy Birthday!",
  "age_text": "turns 7!",
  "see_wishes": "See the wishes",
  "send_wish": "Send a wish",
  "login": "Login",
  "logout": "Logout",
  "username": "Username",
  "password": "Password",
  "login_button": "Sign In",
  "welcome": "Welcome",
  "set_password": "Set your password",
  "choose_username": "Choose a username",
  "accept_invite": "Join the party!",
  "gallery_title": "Birthday Wishes",
  "upload_title": "Send a Birthday Wish",
  "upload_button": "Upload",
  "upload_caption_placeholder": "Write a message...",
  "upload_success": "Your wish has been submitted for approval!",
  "upload_select_file": "Select a photo or video",
  "pending_notice": "Pending approval",
  "tap_to_open": "Tap to open",
  "unmute": "Unmute",
  "countdown_title": "Birthday countdown",
  "days": "days",
  "hours": "hours",
  "minutes": "minutes",
  "seconds": "seconds",
  "no_wishes_yet": "No wishes yet. Be the first!",
  "my_uploads": "My Uploads"
}
```

`packages/web/src/i18n/fa.json`:
```json
{
  "lang_name": "فارسی",
  "birthday_greeting": "!تولدت مبارک",
  "age_text": "!۷ ساله شد",
  "see_wishes": "آرزوها را ببینید",
  "send_wish": "آرزو بفرستید",
  "login": "ورود",
  "logout": "خروج",
  "username": "نام کاربری",
  "password": "رمز عبور",
  "login_button": "ورود",
  "welcome": "خوش آمدید",
  "set_password": "رمز عبور خود را تعیین کنید",
  "choose_username": "نام کاربری انتخاب کنید",
  "accept_invite": "!به جشن بپیوندید",
  "gallery_title": "آرزوهای تولد",
  "upload_title": "آرزوی تولد بفرستید",
  "upload_button": "ارسال",
  "upload_caption_placeholder": "...پیامی بنویسید",
  "upload_success": "!آرزوی شما برای تأیید ارسال شد",
  "upload_select_file": "یک عکس یا ویدیو انتخاب کنید",
  "pending_notice": "در انتظار تأیید",
  "tap_to_open": "لمس کنید تا باز شود",
  "unmute": "صدا را روشن کنید",
  "countdown_title": "شمارش معکوس تولد",
  "days": "روز",
  "hours": "ساعت",
  "minutes": "دقیقه",
  "seconds": "ثانیه",
  "no_wishes_yet": ".هنوز آرزویی نیست. اولین نفر باشید",
  "my_uploads": "ارسال‌های من"
}
```

`packages/web/src/i18n/nb.json`:
```json
{
  "lang_name": "Norsk",
  "birthday_greeting": "Gratulerer med dagen!",
  "age_text": "fyller 7!",
  "see_wishes": "Se ønskene",
  "send_wish": "Send et ønske",
  "login": "Logg inn",
  "logout": "Logg ut",
  "username": "Brukernavn",
  "password": "Passord",
  "login_button": "Logg inn",
  "welcome": "Velkommen",
  "set_password": "Velg et passord",
  "choose_username": "Velg brukernavn",
  "accept_invite": "Bli med på festen!",
  "gallery_title": "Bursdagsønsker",
  "upload_title": "Send et bursdagsønske",
  "upload_button": "Last opp",
  "upload_caption_placeholder": "Skriv en melding...",
  "upload_success": "Ønsket ditt er sendt til godkjenning!",
  "upload_select_file": "Velg et bilde eller en video",
  "pending_notice": "Venter på godkjenning",
  "tap_to_open": "Trykk for å åpne",
  "unmute": "Slå på lyd",
  "countdown_title": "Nedtelling til bursdag",
  "days": "dager",
  "hours": "timer",
  "minutes": "minutter",
  "seconds": "sekunder",
  "no_wishes_yet": "Ingen ønsker ennå. Vær den første!",
  "my_uploads": "Mine opplastinger"
}
```

- [ ] **Step 3: Create i18n context**

`packages/web/src/i18n/I18nContext.tsx`:
```tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import en from "./en.json";
import fa from "./fa.json";
import nb from "./nb.json";

type Lang = "en" | "fa" | "nb";
type Translations = typeof en;

const translations: Record<Lang, Translations> = { en, fa, nb };

type I18nContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof Translations) => string;
  dir: "ltr" | "rtl";
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("lang") as Lang) || "en";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  };

  const dir = lang === "fa" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang, dir]);

  const t = (key: keyof Translations) => {
    return translations[lang][key] || translations.en[key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
```

- [ ] **Step 4: Create auth context and route guards**

`packages/web/src/auth/AuthContext.tsx`:
```tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { api, ApiError } from "../api";

type User = {
  id: string;
  username: string;
  display_name: string;
  role: "admin" | "user";
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  needsSetup: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const refresh = async () => {
    try {
      const { user } = await api.auth.me();
      setUser(user);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { needs_setup } = await api.auth.status();
        setNeedsSetup(needs_setup);
        if (!needs_setup) {
          await refresh();
        }
      } catch {
        // API not reachable
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (username: string, password: string) => {
    const { user } = await api.auth.login({ username, password });
    setUser(user);
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, needsSetup, login, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

`packages/web/src/auth/ProtectedRoute.tsx`:
```tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
```

`packages/web/src/auth/AdminRoute.tsx`:
```tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/gallery" replace />;

  return <>{children}</>;
}
```

- [ ] **Step 5: Update App.tsx with providers and routes**

`packages/web/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "./i18n/I18nContext";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AdminRoute } from "./auth/AdminRoute";

// Lazy-load pages (will be created in subsequent tasks)
function Placeholder({ name }: { name: string }) {
  return <div className="p-8 text-center text-gray-500">{name} — coming soon</div>;
}

export function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Placeholder name="Home" />} />
            <Route path="/login" element={<Placeholder name="Login" />} />
            <Route path="/setup" element={<Placeholder name="Setup" />} />
            <Route path="/invite/:token" element={<Placeholder name="Invite" />} />
            <Route
              path="/gallery"
              element={
                <ProtectedRoute>
                  <Placeholder name="Gallery" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <Placeholder name="Upload" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <AdminRoute>
                  <Placeholder name="Admin" />
                </AdminRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 6: Verify the app builds**

Run: `cd packages/web && npm run build`

Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/
git commit -m "feat: add API client, i18n (EN/FA/NB), auth context, and route guards"
```

---

### Task 12: Frontend — Login & Setup Pages

**Files:**
- Create: `packages/web/src/pages/Login.tsx`
- Create: `packages/web/src/pages/Setup.tsx`
- Create: `packages/web/src/components/LanguagePicker.tsx`
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Create LanguagePicker component**

`packages/web/src/components/LanguagePicker.tsx`:
```tsx
import { useI18n } from "../i18n/I18nContext";

export function LanguagePicker({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();

  const langs = [
    { code: "fa" as const, label: "فارسی", flag: "🇮🇷" },
    { code: "nb" as const, label: "Norsk", flag: "🇳🇴" },
    { code: "en" as const, label: "English", flag: "🇬🇧" },
  ];

  return (
    <div className={`flex gap-2 ${className}`}>
      {langs.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            lang === l.code
              ? "bg-pink-500 text-white"
              : "bg-white/20 text-white hover:bg-white/30"
          }`}
        >
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create Login page**

`packages/web/src/pages/Login.tsx`:
```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { LanguagePicker } from "../components/LanguagePicker";

export function Login() {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/gallery");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 flex flex-col items-center justify-center p-4">
      <LanguagePicker className="absolute top-4 right-4" />
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-purple-700 mb-6">
          {t("login")}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("username")}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "..." : t("login_button")}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Setup page (first-run admin)**

`packages/web/src/pages/Setup.tsx`:
```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";

export function Setup() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.auth.setup({
        username,
        display_name: displayName,
        password,
      });
      await refresh();
      navigate("/admin");
    } catch (err: any) {
      setError(err.message || "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-purple-700 mb-2">
          Welcome!
        </h1>
        <p className="text-center text-gray-600 mb-6 text-sm">
          Set up your admin account to get started.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="e.g. Baba"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Setting up..." : "Create Admin Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update App.tsx to use real pages**

Replace the Login and Setup placeholder routes in `packages/web/src/App.tsx`:
```tsx
import { Login } from "./pages/Login";
import { Setup } from "./pages/Setup";
// ... in Routes:
<Route path="/login" element={<Login />} />
<Route path="/setup" element={<Setup />} />
```

- [ ] **Step 5: Verify build**

Run: `cd packages/web && npm run build`

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/
git commit -m "feat: add Login, Setup pages and LanguagePicker component"
```

---

### Task 13: Frontend — Invite Accept Page

**Files:**
- Create: `packages/web/src/pages/Invite.tsx`
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Create Invite page**

`packages/web/src/pages/Invite.tsx`:
```tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { LanguagePicker } from "../components/LanguagePicker";

export function Invite() {
  const { token } = useParams<{ token: string }>();
  const { refresh } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.invites
      .get(token)
      .then((data) => {
        setDisplayName(data.display_name);
        setAlreadyAccepted(data.invite_accepted);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.invites.accept(token!, { username, password });
      await refresh();
      navigate("/gallery");
    } catch (err: any) {
      setError(err.message || "Failed to accept invite");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 flex items-center justify-center">
        <p className="text-white text-xl">Invite not found.</p>
      </div>
    );
  }

  if (alreadyAccepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 flex flex-col items-center justify-center gap-4">
        <p className="text-white text-xl">This invite has already been accepted.</p>
        <button
          onClick={() => navigate("/login")}
          className="px-6 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-100"
        >
          {t("login")}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 flex flex-col items-center justify-center p-4">
      <LanguagePicker className="absolute top-4 right-4" />
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-purple-700 mb-2">
          {t("welcome")}, {displayName}!
        </h1>
        <p className="text-center text-gray-600 mb-6 text-sm">
          {t("choose_username")} & {t("set_password")}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("username")}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "..." : t("accept_invite")}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx**

Replace the Invite placeholder:
```tsx
import { Invite } from "./pages/Invite";
// ...
<Route path="/invite/:token" element={<Invite />} />
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/pages/Invite.tsx packages/web/src/App.tsx
git commit -m "feat: add invite accept page with username/password registration"
```

---

### Task 14: Frontend — Birthday Surprise Animation

**Files:**
- Create: `packages/web/src/pages/Home.tsx`
- Create: `packages/web/src/components/EnvelopeAnimation.tsx`
- Create: `packages/web/src/components/CardAnimation.tsx`
- Create: `packages/web/src/components/ConfettiEffect.tsx`
- Create: `packages/web/src/components/CountdownTimer.tsx`
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Create ConfettiEffect component**

`packages/web/src/components/ConfettiEffect.tsx`:
```tsx
import { useEffect, useRef } from "react";

export function ConfettiEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [
      "#ff6b9d", "#c44dff", "#ffd700", "#ff4757",
      "#2ed573", "#1e90ff", "#ff6348", "#ffa502",
    ];

    type Particle = {
      x: number; y: number; r: number;
      vx: number; vy: number; color: string;
      rotation: number; rotationSpeed: number;
    };

    const particles: Particle[] = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
    }));

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r / 2, -p.r, p.r, p.r * 2);
        ctx.restore();

        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.vy += 0.05;

        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
          p.vy = Math.random() * 3 + 2;
        }
      });
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
}
```

- [ ] **Step 2: Create EnvelopeAnimation component**

`packages/web/src/components/EnvelopeAnimation.tsx`:
```tsx
import { motion } from "framer-motion";
import { useI18n } from "../i18n/I18nContext";

type Props = { onOpen: () => void };

export function EnvelopeAnimation({ onOpen }: Props) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-yellow-300/60"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
          }}
          animate={{
            y: [null, Math.random() * -200],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}

      <motion.div
        className="cursor-pointer"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onOpen}
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        {/* Envelope SVG */}
        <div className="relative w-72 h-48 bg-gradient-to-br from-pink-200 to-pink-300 rounded-lg shadow-2xl flex items-center justify-center border-2 border-pink-400">
          {/* Flap */}
          <div className="absolute -top-12 left-0 right-0 h-24 overflow-hidden">
            <div
              className="w-full h-full bg-gradient-to-br from-pink-300 to-pink-400 border-2 border-pink-400"
              style={{
                clipPath: "polygon(0 100%, 50% 0%, 100% 100%)",
              }}
            />
          </div>
          {/* Name */}
          <span className="text-3xl font-bold text-pink-700 z-10">
            Gandom
          </span>
          {/* Heart seal */}
          <motion.div
            className="absolute -top-2 left-1/2 -translate-x-1/2 text-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            💖
          </motion.div>
        </div>
      </motion.div>

      <motion.p
        className="mt-8 text-white/80 text-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {t("tap_to_open")}
      </motion.p>
    </div>
  );
}
```

- [ ] **Step 3: Create CardAnimation component**

`packages/web/src/components/CardAnimation.tsx`:
```tsx
import { motion } from "framer-motion";
import { useI18n } from "../i18n/I18nContext";

type Props = {
  message: string;
  onComplete: () => void;
};

export function CardAnimation({ message, onComplete }: Props) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <motion.div
        className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        initial={{ y: 100, opacity: 0, rotateX: 90 }}
        animate={{ y: 0, opacity: 1, rotateX: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
      >
        <motion.h1
          className="text-4xl font-bold text-purple-700 mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          {t("birthday_greeting")}
        </motion.h1>

        <motion.div
          className="text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 my-6"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 150 }}
        >
          7
        </motion.div>

        <motion.p
          className="text-xl text-purple-600 mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          {t("age_text")}
        </motion.p>

        <motion.p
          className="text-lg text-gray-600 mt-6 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          onAnimationComplete={onComplete}
        >
          {message}
        </motion.p>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 4: Create CountdownTimer component**

`packages/web/src/components/CountdownTimer.tsx`:
```tsx
import { useState, useEffect } from "react";
import { useI18n } from "../i18n/I18nContext";

type Props = { targetDate: string };

export function CountdownTimer({ targetDate }: Props) {
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.total <= 0) return null;

  const units = [
    { value: timeLeft.days, label: t("days") },
    { value: timeLeft.hours, label: t("hours") },
    { value: timeLeft.minutes, label: t("minutes") },
    { value: timeLeft.seconds, label: t("seconds") },
  ];

  return (
    <div className="text-center">
      <h2 className="text-2xl text-white/90 mb-6">{t("countdown_title")}</h2>
      <div className="flex gap-4 justify-center">
        {units.map((u) => (
          <div
            key={u.label}
            className="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[80px]"
          >
            <div className="text-4xl font-bold text-white">
              {String(u.value).padStart(2, "0")}
            </div>
            <div className="text-white/70 text-sm mt-1">{u.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getTimeLeft(target: string) {
  const total = new Date(target).getTime() - Date.now();
  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}
```

- [ ] **Step 5: Create Home page (orchestrates the surprise)**

`packages/web/src/pages/Home.tsx`:
```tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api";
import { LanguagePicker } from "../components/LanguagePicker";
import { EnvelopeAnimation } from "../components/EnvelopeAnimation";
import { CardAnimation } from "../components/CardAnimation";
import { ConfettiEffect } from "../components/ConfettiEffect";
import { CountdownTimer } from "../components/CountdownTimer";

type Step = "language" | "envelope" | "card" | "final";

export function Home() {
  const { lang, t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(() =>
    localStorage.getItem("lang") ? "envelope" : "language"
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    api.gallery.settings().then((data) => setSettings(data.settings)).catch(() => {});
  }, []);

  const message =
    settings[`birthday_message_${lang}`] || settings.birthday_message_en || "";

  const isCountdown = settings.mode === "countdown";

  if (isCountdown) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 flex flex-col items-center justify-center p-4">
        <LanguagePicker className="absolute top-4 right-4" />
        <CountdownTimer targetDate={settings.birthday_date || ""} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 relative overflow-hidden">
      <LanguagePicker className="absolute top-4 right-4 z-40" />

      {showConfetti && <ConfettiEffect />}

      <AnimatePresence mode="wait">
        {step === "language" && (
          <motion.div
            key="language"
            className="flex flex-col items-center justify-center min-h-screen gap-8"
            exit={{ opacity: 0 }}
          >
            <h2 className="text-2xl text-white font-bold">Choose your language</h2>
            <div className="flex gap-4">
              {[
                { code: "fa" as const, label: "فارسی", flag: "🇮🇷" },
                { code: "nb" as const, label: "Norsk", flag: "🇳🇴" },
                { code: "en" as const, label: "English", flag: "🇬🇧" },
              ].map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    const { setLang } = useI18n as any;
                    localStorage.setItem("lang", l.code);
                    window.location.reload();
                  }}
                  className="px-6 py-4 bg-white/20 backdrop-blur-sm rounded-xl text-white hover:bg-white/30 transition-colors text-lg"
                >
                  <span className="text-3xl block mb-2">{l.flag}</span>
                  {l.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === "envelope" && (
          <motion.div key="envelope" exit={{ opacity: 0, scale: 0.8 }}>
            <EnvelopeAnimation onOpen={() => setStep("card")} />
          </motion.div>
        )}

        {step === "card" && (
          <motion.div key="card" exit={{ opacity: 0 }}>
            <CardAnimation
              message={message}
              onComplete={() => {
                setShowConfetti(true);
                setTimeout(() => setStep("final"), 500);
              }}
            />
          </motion.div>
        )}

        {step === "final" && (
          <motion.div
            key="final"
            className="flex flex-col items-center justify-center min-h-screen gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.h1
              className="text-5xl font-extrabold text-white text-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
            >
              {t("birthday_greeting")}
            </motion.h1>

            <div className="flex gap-4 mt-8">
              <motion.button
                className="px-8 py-3 bg-white text-purple-600 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-shadow"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(user ? "/gallery" : "/login")}
              >
                {t("see_wishes")}
              </motion.button>
              <motion.button
                className="px-8 py-3 bg-purple-700 text-white rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-shadow"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(user ? "/upload" : "/login")}
              >
                {t("send_wish")}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 6: Update App.tsx**

Replace the Home placeholder:
```tsx
import { Home } from "./pages/Home";
// ...
<Route path="/" element={<Home />} />
```

- [ ] **Step 7: Verify build**

Run: `cd packages/web && npm run build`

Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/
git commit -m "feat: add birthday surprise animation — envelope, card, confetti, countdown"
```

---

### Task 15: Frontend — Gallery Page

**Files:**
- Create: `packages/web/src/pages/Gallery.tsx`
- Create: `packages/web/src/components/GalleryGrid.tsx`
- Create: `packages/web/src/components/MediaCard.tsx`
- Create: `packages/web/src/components/Lightbox.tsx`
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Create Lightbox component**

`packages/web/src/components/Lightbox.tsx`:
```tsx
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  src: string;
  mediaType: "image" | "video";
  onClose: () => void;
};

export function Lightbox({ src, mediaType, onClose }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="max-w-4xl max-h-[90vh] relative"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute -top-10 right-0 text-white text-3xl hover:text-gray-300"
          >
            &times;
          </button>
          {mediaType === "image" ? (
            <img
              src={src}
              alt=""
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          ) : (
            <video
              src={src}
              controls
              autoPlay
              className="max-w-full max-h-[85vh] rounded-lg"
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Create MediaCard component**

`packages/web/src/components/MediaCard.tsx`:
```tsx
import { api } from "../api";

type Props = {
  item: {
    id: string;
    file_key: string;
    thumbnail_key: string | null;
    media_type: "image" | "video";
    caption: string | null;
    uploaded_at: string;
    display_name: string;
  };
  onClick: () => void;
};

export function MediaCard({ item, onClick }: Props) {
  const src = api.gallery.fileUrl(item.thumbnail_key || item.file_key);
  const date = new Date(item.uploaded_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="group cursor-pointer rounded-xl overflow-hidden shadow-lg bg-white hover:shadow-xl transition-shadow"
      onClick={onClick}
    >
      <div className="aspect-square overflow-hidden bg-gray-100">
        {item.media_type === "image" ? (
          <img
            src={src}
            alt={item.caption || ""}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="relative w-full h-full">
            <video
              src={api.gallery.fileUrl(item.file_key)}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center">
                <div className="w-0 h-0 border-l-[16px] border-l-purple-600 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent ml-1" />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-3">
        {item.caption && (
          <p className="text-gray-700 text-sm mb-1 line-clamp-2">
            {item.caption}
          </p>
        )}
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>{item.display_name}</span>
          <span>{date}</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create GalleryGrid component**

`packages/web/src/components/GalleryGrid.tsx`:
```tsx
import { useState } from "react";
import { MediaCard } from "./MediaCard";
import { Lightbox } from "./Lightbox";
import { api } from "../api";

type GalleryItem = {
  id: string;
  file_key: string;
  thumbnail_key: string | null;
  media_type: "image" | "video";
  caption: string | null;
  uploaded_at: string;
  display_name: string;
};

type Props = { items: GalleryItem[] };

export function GalleryGrid({ items }: Props) {
  const [selected, setSelected] = useState<GalleryItem | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            onClick={() => setSelected(item)}
          />
        ))}
      </div>

      {selected && (
        <Lightbox
          src={api.gallery.fileUrl(selected.file_key)}
          mediaType={selected.media_type}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 4: Create Gallery page**

`packages/web/src/pages/Gallery.tsx`:
```tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../auth/AuthContext";
import { GalleryGrid } from "../components/GalleryGrid";
import { LanguagePicker } from "../components/LanguagePicker";

export function Gallery() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.gallery
      .list()
      .then((data) => setItems(data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-purple-700">
            {t("gallery_title")}
          </h1>
          <div className="flex items-center gap-3">
            <LanguagePicker />
            <button
              onClick={() => navigate("/upload")}
              className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
            >
              {t("send_wish")}
            </button>
            {user?.role === "admin" && (
              <button
                onClick={() => navigate("/admin")}
                className="px-4 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700"
              >
                Admin
              </button>
            )}
            <button
              onClick={async () => {
                await logout();
                navigate("/");
              }}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              {t("logout")}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-center text-gray-500 text-lg mt-16">
            {t("no_wishes_yet")}
          </p>
        ) : (
          <GalleryGrid items={items} />
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Update App.tsx**

Replace the Gallery placeholder:
```tsx
import { Gallery } from "./pages/Gallery";
// ...
<Route path="/gallery" element={<ProtectedRoute><Gallery /></ProtectedRoute>} />
```

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/
git commit -m "feat: add gallery page with grid, lightbox, and media cards"
```

---

### Task 16: Frontend — Upload Page

**Files:**
- Create: `packages/web/src/pages/Upload.tsx`
- Create: `packages/web/src/components/UploadForm.tsx`
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Create UploadForm component**

`packages/web/src/components/UploadForm.tsx`:
```tsx
import { useState, useRef } from "react";
import { useI18n } from "../i18n/I18nContext";
import { api } from "../api";

type Props = {
  onSuccess: () => void;
};

export function UploadForm({ onSuccess }: Props) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError("");

    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    if (caption.trim()) formData.append("caption", caption.trim());

    try {
      await api.uploads.create(formData);
      setFile(null);
      setPreview(null);
      setCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="max-h-48 mx-auto rounded-lg"
          />
        ) : file ? (
          <p className="text-purple-600">{file.name}</p>
        ) : (
          <p className="text-gray-500">{t("upload_select_file")}</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder={t("upload_caption_placeholder")}
        rows={3}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none"
      />

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <button
        type="submit"
        disabled={!file || uploading}
        className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
      >
        {uploading ? "Uploading..." : t("upload_button")}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create Upload page**

`packages/web/src/pages/Upload.tsx`:
```tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../auth/AuthContext";
import { UploadForm } from "../components/UploadForm";
import { LanguagePicker } from "../components/LanguagePicker";

export function Upload() {
  const { t } = useI18n();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [myUploads, setMyUploads] = useState<any[]>([]);
  const [success, setSuccess] = useState(false);

  const loadMyUploads = () => {
    api.uploads.mine().then((data) => setMyUploads(data.uploads)).catch(() => {});
  };

  useEffect(() => {
    loadMyUploads();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-purple-700">
            {t("upload_title")}
          </h1>
          <div className="flex items-center gap-3">
            <LanguagePicker />
            <button
              onClick={() => navigate("/gallery")}
              className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm"
            >
              {t("see_wishes")}
            </button>
            <button
              onClick={async () => { await logout(); navigate("/"); }}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              {t("logout")}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {success && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg text-center">
            {t("upload_success")}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <UploadForm
            onSuccess={() => {
              setSuccess(true);
              loadMyUploads();
              setTimeout(() => setSuccess(false), 5000);
            }}
          />
        </div>

        {/* My uploads */}
        {myUploads.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              {t("my_uploads")}
            </h2>
            <div className="space-y-3">
              {myUploads.map((u) => (
                <div
                  key={u.id}
                  className="bg-white rounded-lg shadow p-4 flex items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {u.media_type === "image" ? (
                      <img
                        src={api.gallery.fileUrl(u.thumbnail_key || u.file_key)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                        ▶
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {u.caption && (
                      <p className="text-sm text-gray-700 truncate">
                        {u.caption}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(u.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      u.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : u.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {u.status === "pending" ? t("pending_notice") : u.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Update App.tsx**

Replace the Upload placeholder:
```tsx
import { Upload } from "./pages/Upload";
// ...
<Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/
git commit -m "feat: add upload page with form, preview, and user's upload history"
```

---

### Task 17: Frontend — Admin Dashboard

**Files:**
- Create: `packages/web/src/pages/admin/AdminLayout.tsx`
- Create: `packages/web/src/pages/admin/Dashboard.tsx`
- Create: `packages/web/src/pages/admin/Users.tsx`
- Create: `packages/web/src/pages/admin/Pending.tsx`
- Create: `packages/web/src/pages/admin/Content.tsx`
- Create: `packages/web/src/pages/admin/Settings.tsx`
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Create AdminLayout**

`packages/web/src/pages/admin/AdminLayout.tsx`:
```tsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

const navItems = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/pending", label: "Pending" },
  { to: "/admin/content", label: "Content" },
  { to: "/admin/settings", label: "Settings" },
];

export function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white shadow-sm border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-bold text-purple-700">Admin</h1>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg text-sm ${
                  isActive
                    ? "bg-purple-100 text-purple-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={() => navigate("/gallery")}
            className="w-full text-sm text-purple-600 hover:text-purple-700"
          >
            View Gallery
          </button>
          <button
            onClick={async () => { await logout(); navigate("/"); }}
            className="w-full text-sm text-gray-500 hover:text-gray-700"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create Dashboard page**

`packages/web/src/pages/admin/Dashboard.tsx`:
```tsx
import { useState, useEffect } from "react";
import { api } from "../../api";

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    api.admin.stats().then(setStats).catch(() => {});
    api.admin.uploads().then((d) => setRecent(d.uploads.slice(0, 10))).catch(() => {});
  }, []);

  if (!stats) return <p>Loading...</p>;

  const statCards = [
    { label: "Total Users", value: stats.total_users, color: "bg-blue-100 text-blue-700" },
    { label: "Pending", value: stats.pending_uploads, color: "bg-yellow-100 text-yellow-700" },
    { label: "Approved", value: stats.approved_uploads, color: "bg-green-100 text-green-700" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className={`rounded-xl p-6 ${s.color}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Uploads</h3>
      <div className="bg-white rounded-xl shadow-sm divide-y">
        {recent.length === 0 ? (
          <p className="p-4 text-gray-500">No uploads yet.</p>
        ) : (
          recent.map((u) => (
            <div key={u.id} className="p-4 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  {u.display_name}
                </span>
                {u.caption && (
                  <span className="text-sm text-gray-500 ml-2">
                    — {u.caption}
                  </span>
                )}
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  u.status === "approved"
                    ? "bg-green-100 text-green-700"
                    : u.status === "rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {u.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Users page**

`packages/web/src/pages/admin/Users.tsx`:
```tsx
import { useState, useEffect } from "react";
import { api } from "../../api";

export function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  const loadUsers = () => {
    api.admin.users().then((d) => setUsers(d.users)).catch(() => {});
  };

  useEffect(() => { loadUsers(); }, []);

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await api.admin.createInvite({ display_name: newName });
    setInviteLink(`${window.location.origin}/invite/${data.invite_token}`);
    setNewName("");
    loadUsers();
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Delete this user and all their uploads?")) return;
    await api.admin.deleteUser(id, true);
    loadUsers();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Users</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
        >
          Create Invite
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <form onSubmit={createInvite} className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Display name (e.g. Uncle Ali)"
              required
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm"
            >
              Generate Link
            </button>
          </form>
          {inviteLink && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-center gap-3">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 text-sm bg-transparent"
              />
              <button
                onClick={() => navigator.clipboard.writeText(inviteLink)}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm divide-y">
        {users.map((u) => (
          <div key={u.id} className="p-4 flex items-center justify-between">
            <div>
              <span className="font-medium text-gray-700">
                {u.display_name}
              </span>
              {u.username && (
                <span className="text-gray-500 text-sm ml-2">
                  @{u.username}
                </span>
              )}
              <span className="text-gray-400 text-xs ml-2">
                {u.invite_accepted ? "Active" : "Invite pending"} · {u.upload_count} uploads
              </span>
            </div>
            <div className="flex items-center gap-2">
              {u.role === "admin" ? (
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                  Admin
                </span>
              ) : (
                <button
                  onClick={() => deleteUser(u.id)}
                  className="text-xs px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Pending page**

`packages/web/src/pages/admin/Pending.tsx`:
```tsx
import { useState, useEffect } from "react";
import { api } from "../../api";

export function Pending() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = () => {
    api.admin.uploads({ status: "pending" }).then((d) => setUploads(d.uploads)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const approve = async (id: string) => {
    await api.admin.updateUpload(id, "approved");
    load();
  };

  const reject = async (id: string) => {
    await api.admin.updateUpload(id, "rejected");
    load();
  };

  const bulkAction = async (action: string) => {
    if (selected.size === 0) return;
    await api.admin.bulkAction([...selected], action);
    setSelected(new Set());
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Pending Approvals ({uploads.length})
        </h2>
        {selected.size > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => bulkAction("approve")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm"
            >
              Approve {selected.size}
            </button>
            <button
              onClick={() => bulkAction("reject")}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
            >
              Reject {selected.size}
            </button>
          </div>
        )}
      </div>

      {uploads.length === 0 ? (
        <p className="text-gray-500">No pending uploads.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {uploads.map((u) => (
            <div
              key={u.id}
              className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 ${
                selected.has(u.id) ? "border-purple-500" : "border-transparent"
              }`}
            >
              <div
                className="aspect-square bg-gray-100 cursor-pointer"
                onClick={() => toggle(u.id)}
              >
                {u.media_type === "image" ? (
                  <img
                    src={api.gallery.fileUrl(u.thumbnail_key || u.file_key)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={api.gallery.fileUrl(u.file_key)}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                )}
              </div>
              <div className="p-3">
                {u.caption && (
                  <p className="text-sm text-gray-600 mb-1 truncate">
                    {u.caption}
                  </p>
                )}
                <p className="text-xs text-gray-500 mb-2">
                  {u.display_name} · {new Date(u.uploaded_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => approve(u.id)}
                    className="flex-1 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reject(u.id)}
                    className="flex-1 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create Content page**

`packages/web/src/pages/admin/Content.tsx`:
```tsx
import { useState, useEffect } from "react";
import { api } from "../../api";

export function Content() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = () => {
    const params = filter ? { status: filter } : undefined;
    api.admin.uploads(params).then((d) => setUploads(d.uploads)).catch(() => {});
  };

  useEffect(() => { load(); }, [filter]);

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const deleteUpload = async (id: string) => {
    if (!confirm("Permanently delete this upload?")) return;
    await api.admin.deleteUpload(id);
    load();
  };

  const revokeApproval = async (id: string) => {
    await api.admin.updateUpload(id, "rejected");
    load();
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} uploads permanently?`)) return;
    await api.admin.bulkAction([...selected], "delete");
    setSelected(new Set());
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">All Content</h2>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          {selected.size > 0 && (
            <button
              onClick={bulkDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
            >
              Delete {selected.size}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {uploads.map((u) => (
          <div
            key={u.id}
            className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 ${
              selected.has(u.id) ? "border-red-500" : "border-transparent"
            }`}
          >
            <div
              className="aspect-square bg-gray-100 cursor-pointer relative"
              onClick={() => toggle(u.id)}
            >
              {u.media_type === "image" ? (
                <img
                  src={api.gallery.fileUrl(u.thumbnail_key || u.file_key)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={api.gallery.fileUrl(u.file_key)}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                />
              )}
              <span
                className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full ${
                  u.status === "approved"
                    ? "bg-green-500 text-white"
                    : u.status === "rejected"
                    ? "bg-red-500 text-white"
                    : "bg-yellow-500 text-white"
                }`}
              >
                {u.status}
              </span>
            </div>
            <div className="p-3">
              <p className="text-xs text-gray-500 mb-2">
                {u.display_name} · {new Date(u.uploaded_at).toLocaleDateString()}
              </p>
              <div className="flex gap-1">
                {u.status === "approved" && (
                  <button
                    onClick={() => revokeApproval(u.id)}
                    className="flex-1 py-1 bg-yellow-100 text-yellow-700 rounded text-xs"
                  >
                    Revoke
                  </button>
                )}
                <button
                  onClick={() => deleteUpload(u.id)}
                  className="flex-1 py-1 bg-red-100 text-red-700 rounded text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create Settings page**

`packages/web/src/pages/admin/Settings.tsx`:
```tsx
import { useState, useEffect } from "react";
import { api } from "../../api";

export function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.admin.settings().then((d) => setSettings(d.settings)).catch(() => {});
  }, []);

  const update = (key: string, value: string) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { settings: updated } = await api.admin.updateSettings(settings);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Site Settings</h2>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Birthday Messages
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                English
              </label>
              <textarea
                value={settings.birthday_message_en || ""}
                onChange={(e) => update("birthday_message_en", e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                فارسی (Persian)
              </label>
              <textarea
                value={settings.birthday_message_fa || ""}
                onChange={(e) => update("birthday_message_fa", e.target.value)}
                rows={2}
                dir="rtl"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Norsk (Norwegian)
              </label>
              <textarea
                value={settings.birthday_message_nb || ""}
                onChange={(e) => update("birthday_message_nb", e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Display Mode
          </h3>
          <select
            value={settings.mode || "animation"}
            onChange={(e) => update("mode", e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="animation">Birthday Animation</option>
            <option value="countdown">Countdown Timer</option>
          </select>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Upload Limits
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Max file size (MB)
              </label>
              <input
                type="number"
                value={settings.max_file_size_mb || "50"}
                onChange={(e) => update("max_file_size_mb", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Max uploads per user
              </label>
              <input
                type="number"
                value={settings.max_uploads_per_user || "20"}
                onChange={(e) => update("max_uploads_per_user", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {saved && (
            <span className="text-green-600 text-sm">Settings saved!</span>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Update App.tsx with admin routes**

Replace the admin placeholder in `packages/web/src/App.tsx`:
```tsx
import { AdminLayout } from "./pages/admin/AdminLayout";
import { Dashboard } from "./pages/admin/Dashboard";
import { Users } from "./pages/admin/Users";
import { Pending } from "./pages/admin/Pending";
import { Content } from "./pages/admin/Content";
import { Settings } from "./pages/admin/Settings";

// In Routes:
<Route
  path="/admin"
  element={
    <AdminRoute>
      <AdminLayout />
    </AdminRoute>
  }
>
  <Route index element={<Dashboard />} />
  <Route path="users" element={<Users />} />
  <Route path="pending" element={<Pending />} />
  <Route path="content" element={<Content />} />
  <Route path="settings" element={<Settings />} />
</Route>
```

- [ ] **Step 8: Verify build**

Run: `cd packages/web && npm run build`

Expected: Build succeeds.

- [ ] **Step 9: Commit**

```bash
git add packages/web/src/
git commit -m "feat: add admin dashboard — stats, users, pending, content, settings"
```

---

### Task 18: Deployment Configuration

**Files:**
- Modify: `packages/api/wrangler.toml`
- Modify: `packages/web/vite.config.ts`

- [ ] **Step 1: Finalize wrangler.toml for production**

The `wrangler.toml` is already configured. To deploy:

```bash
# Create D1 database
cd packages/api
npx wrangler d1 create gandom-db
# Copy the database_id from output into wrangler.toml

# Create R2 bucket
npx wrangler r2 bucket create gandom-files

# Run migration
npx wrangler d1 execute gandom-db --file=src/db/schema.sql

# Deploy worker
npx wrangler deploy
```

- [ ] **Step 2: Update web vite config for production API URL**

The Vite proxy handles development. For production, update `packages/web/vite.config.ts` to ensure the production build points to the deployed Worker URL. The API client in `api.ts` already uses `VITE_API_URL` env var — set it during build:

```bash
cd packages/web
VITE_API_URL=https://gandom-api.<your-subdomain>.workers.dev npm run build
npx wrangler pages deploy dist --project-name=gandom-birthday
```

- [ ] **Step 3: Update CORS origin in wrangler.toml**

After deploying Pages, update `CORS_ORIGIN` in `wrangler.toml` to match the actual Pages URL:

```toml
[vars]
CORS_ORIGIN = "https://gandom-birthday.pages.dev"
```

Then redeploy the worker: `npx wrangler deploy`

- [ ] **Step 4: Commit**

```bash
git add packages/api/wrangler.toml
git commit -m "chore: finalize deployment configuration"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Admin setup (first-run) — Task 5
- [x] Invite flow (create, accept) — Task 6
- [x] Login/logout/session — Task 5
- [x] Route protection — Task 11
- [x] Upload with validation — Task 8
- [x] Gallery with approved items — Task 9
- [x] Admin approval/reject — Task 10
- [x] Admin full control (delete, revoke, bulk) — Task 10
- [x] Birthday surprise animation (envelope, card, confetti) — Task 14
- [x] Countdown timer — Task 14
- [x] i18n (EN, FA, NB) with RTL — Task 11
- [x] Admin dashboard stats — Task 17
- [x] Admin user management — Task 17
- [x] Admin pending approvals — Task 17
- [x] Admin content management — Task 17
- [x] Admin settings — Task 17
- [x] Deployment — Task 18
- [x] File serving from R2 — Task 9

**Placeholder scan:** No TBDs, TODOs, or "implement later" found.

**Type consistency:** `User`, `Upload`, `Session`, `Env`, `SiteSettings` types defined in Task 3 and used consistently. API client methods in Task 11 match the route signatures from Tasks 5-10. `sanitizeUser` used consistently in auth and invite routes.

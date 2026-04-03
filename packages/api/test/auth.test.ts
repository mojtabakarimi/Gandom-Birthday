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

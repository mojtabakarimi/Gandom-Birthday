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

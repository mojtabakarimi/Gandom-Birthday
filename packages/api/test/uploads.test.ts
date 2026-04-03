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

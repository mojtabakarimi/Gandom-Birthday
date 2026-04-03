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
      "DELETE FROM sessions; DELETE FROM uploads; DELETE FROM users;"
    );
  });

  it("returns public site settings (no auth required)", async () => {
    const res = await request("/api/gallery/settings");
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.settings.mode).toBe("animation");
    expect(data.settings.birthday_message_en).toBeDefined();
  });
});

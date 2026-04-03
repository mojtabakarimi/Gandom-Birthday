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
    const invRes = await request("/api/invites", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({ display_name: "ToDelete" }),
    });
    const { id: userId } = await invRes.json() as any;

    const res = await request(`/api/admin/users/${userId}?delete_uploads=true`, {
      method: "DELETE",
      cookie: adminCookie,
    });
    expect(res.status).toBe(200);

    const usersRes = await request("/api/admin/users", { cookie: adminCookie });
    const data = await usersRes.json() as any;
    expect(data.users.length).toBe(1);
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
    const adminId = (
      await env.DB.prepare("SELECT id FROM users LIMIT 1").first<{ id: string }>()
    )!.id;
    await env.DB.prepare(
      `INSERT INTO uploads (id, user_id, file_key, media_type, status)
       VALUES ('u1', '${adminId}', 'uploads/test.jpg', 'image', 'pending')`
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
      await env.DB.prepare("SELECT id FROM users LIMIT 1").first<{ id: string }>()
    )!.id;
    await env.DB.prepare(
      "INSERT INTO uploads (id, user_id, file_key, media_type, status) VALUES (?, ?, 'f1.jpg', 'image', 'pending')"
    ).bind("b1", adminId).run();
    await env.DB.prepare(
      "INSERT INTO uploads (id, user_id, file_key, media_type, status) VALUES (?, ?, 'f2.jpg', 'image', 'pending')"
    ).bind("b2", adminId).run();

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
      await env.DB.prepare("SELECT id FROM users LIMIT 1").first<{ id: string }>()
    )!.id;
    await env.DB.prepare(
      "INSERT INTO uploads (id, user_id, file_key, media_type, status) VALUES (?, ?, 'f3.jpg', 'image', 'pending')"
    ).bind("d1", adminId).run();
    await env.DB.prepare(
      "INSERT INTO uploads (id, user_id, file_key, media_type, status) VALUES (?, ?, 'f4.jpg', 'image', 'rejected')"
    ).bind("d2", adminId).run();

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

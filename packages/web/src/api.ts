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

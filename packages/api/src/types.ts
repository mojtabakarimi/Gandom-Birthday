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

# Gandom's Birthday Website — Design Spec

## Overview

A surprise birthday website for Gandom Anzanpour's 7th birthday. The site features a multi-step animated birthday reveal as the public landing page, followed by a private photo/video gallery where family and friends can upload and view birthday wishes — all managed by the father (admin) with full approval control.

Up to 200 users. Trilingual: Persian (RTL), Norwegian, English.

## Hosting & Infrastructure

Everything runs on Cloudflare's edge network:

| Service | Purpose |
|---|---|
| **Cloudflare Pages** | Hosts the React SPA |
| **Cloudflare Workers** | Runs the Hono API |
| **Cloudflare D1** | SQLite database (users, sessions, uploads) |
| **Cloudflare R2** | Object storage (images, videos, thumbnails) |

Domain: `gandom-birthday.pages.dev` (Cloudflare Pages subdomain).

## Architecture

```
┌─────────────────────────────────────┐
│        Cloudflare Pages             │
│   React SPA (Vite) + Animations    │
│                                     │
│  Public:  Birthday surprise/reveal  │
│  Private: Gallery, Upload, Admin    │
└──────────────┬──────────────────────┘
               │ REST API calls
               ▼
┌─────────────────────────────────────┐
│        Cloudflare Worker            │
│        Hono API Server              │
│                                     │
│  /api/auth/*     - login, sessions  │
│  /api/uploads/*  - upload, approve  │
│  /api/users/*    - invite, manage   │
│  /api/gallery/*  - public content   │
└──────┬──────────────┬───────────────┘
       │              │
       ▼              ▼
┌────────────┐  ┌────────────┐
│ Cloudflare │  │ Cloudflare │
│     D1     │  │     R2     │
│  (SQLite)  │  │  (files)   │
│            │  │            │
│ users      │  │ images/    │
│ sessions   │  │ videos/    │
│ uploads    │  │ thumbnails/│
│ approvals  │  │            │
└────────────┘  └────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite, deployed to Cloudflare Pages |
| Animations | Framer Motion + CSS animations |
| Styling | Tailwind CSS |
| i18n | React context + JSON translation files (fa.json, nb.json, en.json) |
| API | Hono, deployed as Cloudflare Worker |
| Database | Cloudflare D1 (SQLite) |
| File Storage | Cloudflare R2 |
| Auth | Custom session-based (HTTP-only cookies) |
| Password Hashing | Web Crypto API (PBKDF2) |
| Image Thumbnails | Cloudflare Image Resizing or Workers-based resize |

## Project Structure

```
gandom-birthday/
├── packages/
│   ├── web/              # React SPA (Vite)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── i18n/
│   │   │   │   ├── fa.json
│   │   │   │   ├── nb.json
│   │   │   │   └── en.json
│   │   │   └── ...
│   │   └── vite.config.ts
│   └── api/              # Hono API (Worker)
│       ├── src/
│       │   ├── routes/
│       │   ├── middleware/
│       │   ├── db/
│       │   │   └── schema.sql
│       │   └── index.ts
│       └── wrangler.toml
├── package.json
└── README.md
```

## Data Model

### users
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| username | TEXT NOT NULL UNIQUE | Chosen by user on invite accept, used for login |
| display_name | TEXT NOT NULL | Display name shown in gallery (set by admin on invite) |
| email | TEXT | Optional, for invite link |
| password_hash | TEXT | Set when user accepts invite |
| role | TEXT | 'admin' or 'user' |
| invite_token | TEXT UNIQUE | Random string for invite URL |
| invite_accepted | BOOLEAN | Default false |
| created_at | TIMESTAMP | |

### sessions
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| user_id | TEXT FK | References users |
| expires_at | TIMESTAMP | 30 days from creation |
| created_at | TIMESTAMP | |

### uploads
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| user_id | TEXT FK | References users |
| file_key | TEXT NOT NULL | R2 object key |
| thumbnail_key | TEXT | R2 key for thumbnail |
| media_type | TEXT | 'image' or 'video' |
| caption | TEXT | Optional text message |
| status | TEXT | 'pending', 'approved', or 'rejected' |
| uploaded_at | TIMESTAMP | |
| reviewed_at | TIMESTAMP | |
| reviewed_by | TEXT FK | References users |

## Authentication

### Admin Setup (first run)
1. Admin visits the site for the first time.
2. Redirected to a setup page — sets username, email, and password.
3. Admin account created with `role: 'admin'`.
4. Setup page disabled once an admin exists.

### Invite Flow
1. Admin creates a user from the dashboard — enters a name (and optionally email).
2. System generates a unique `invite_token`, returns a link: `site.pages.dev/invite/{token}`.
3. Admin shares the link with the person (via WhatsApp, Telegram, etc.).
4. Person clicks the link → sees a "Welcome, [name]!" page → chooses a username and sets their password.
5. `invite_accepted = true`, `username` and `password_hash` stored.
6. Person is automatically logged in.

### Login
1. User enters username + password.
2. Server verifies credentials → creates session → sets HTTP-only cookie.
3. Session expires after 30 days.

### Route Protection
| Route | Access |
|---|---|
| `/` | Public (birthday animation) |
| `/invite/:token` | Public (accept invite) |
| `/login` | Public |
| `/gallery` | Requires login |
| `/upload` | Requires login |
| `/admin/*` | Requires login + admin role |

## Upload & Approval Flow

### Uploading
1. Logged-in user goes to `/upload`.
2. Selects image(s) or a short video (max 30 seconds, max 50MB).
3. Optionally writes a caption/message.
4. File uploaded to Hono API → stored in R2 under `uploads/{user_id}/{uuid}.{ext}`.
5. For images, a thumbnail is generated (resized server-side).
6. Record created in D1 with `status: 'pending'`.
7. User sees confirmation message.

### File Limits
| Type | Max Size | Formats | Duration |
|---|---|---|---|
| Image | 10MB | JPEG, PNG, WebP, HEIC | — |
| Video | 50MB | MP4, MOV | 30 seconds |
| Per user | 20 uploads total | — | — |

### Admin Approval
1. Admin visits `/admin/pending`.
2. Sees pending uploads — thumbnail/preview, caption, uploader, timestamp.
3. Per item: Approve or Reject.
4. Bulk approve/reject supported.
5. Rejected items stay in R2 for reconsideration.

### Admin Full Control
- Delete any individual upload (pending, approved, or rejected) — removes from R2 + D1.
- Delete a user — with option to keep or delete all their uploads.
- Revoke approval — moves approved content back to hidden.
- Bulk delete — select multiple items and delete at once.

## Gallery

- Route: `/gallery` (requires login).
- Displays all approved uploads.
- Each item shows: image/video, caption, uploader's name, timestamp (e.g., "April 3, 2026").
- Sorted by upload date (newest first).
- Images: thumbnails in grid → lightbox on click for full size.
- Videos: inline playback.
- Lazy-loaded for performance.

## Birthday Surprise Experience

Public landing page (`/`). Multi-step animated reveal:

### Step 1 — The Envelope
- Animated envelope with "Gandom" written in the selected language's script.
- Soft particle effects (floating stars/sparkles).
- User clicks/taps → envelope opens.

### Step 2 — The Card
- Birthday card slides out and unfolds.
- Greeting in selected language:
  - Persian: "!تولدت مبارک"
  - Norwegian: "Gratulerer med dagen!"
  - English: "Happy Birthday!"
- Her age "7" in playful animated style.

### Step 3 — Confetti & Message
- Confetti/balloon explosion animation.
- Admin-configurable personal message (in all three languages).
- Background music option (muted by default, click to unmute).

### Step 4 — Call to Action
- Two buttons:
  - "See the wishes" → `/login` (or `/gallery` if logged in)
  - "Send a wish" → `/login` (or `/upload` if logged in)

### Admin-Configurable
- Birthday message text (3 languages).
- Background music file (optional, stored in R2).
- Toggle countdown mode (before birthday) vs. animation mode (on/after birthday).

## Internationalization (i18n)

### Language Selection
- On first visit, language picker appears before animation: Persian | Norsk | English.
- Saved in `localStorage`.
- Changeable anytime via toggle in corner.
- All UI text respects selected language.
- Persian triggers RTL layout automatically.

### Implementation
- Simple JSON translation files (`fa.json`, `nb.json`, `en.json`).
- React context-based provider.
- Admin dashboard is English-only.

## Admin Dashboard

English-only, admin role required. Routes under `/admin`.

### Dashboard Home (`/admin`)
- Quick stats: total users, pending uploads, approved uploads, storage used.
- Recent activity (last 10 uploads).

### User Management (`/admin/users`)
- List of all users: name, invite status, upload count.
- "Create Invite" → enter name → generates link → copy to clipboard.
- Deactivate or delete a user (with option to keep/delete their uploads).

### Pending Approvals (`/admin/pending`)
- Grid of pending uploads with thumbnails/previews.
- Each card: preview, caption, uploader name, timestamp.
- Approve / Reject per item.
- Bulk approve / reject.
- Filter by user.

### Content Management (`/admin/content`)
- Grid of all content (approved, rejected, pending).
- Revoke approval, delete permanently, bulk delete.

### Site Settings (`/admin/settings`)
- Edit birthday message (3 language fields).
- Upload/change background music.
- Toggle countdown vs. animation mode.
- Set upload limits (max file size, max uploads per user).

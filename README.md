# PageTurn 📖

PageTurn is a beautifully designed, highly functional personal EPUB e-reader, library manager, and reading analytics application. Built with a modern web stack, it offers a premium, app-like reading experience directly in the browser, featuring a striking **Red-Black Dark Zinc** design aesthetic.

This document serves as a comprehensive overview of the project's architecture, database schema, and technical implementations to aid in further refinement or feature additions.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [Lucide React](https://lucide.dev/) (Icons)
- **Database & Auth**: [Supabase](https://supabase.com/) (Postgres, Storage, Realtime, Auth)
- **EPUB Rendering**: [epub.js](http://epubjs.org/)
- **Data Visualization**: [Recharts](https://recharts.org/)
- **Offline & PWA**: `localforage` (IndexedDB) & `@serwist/next` (Service Workers)

---

## ✨ Core Features

1. **Premium Aesthetic UI**
   - Deep dark zinc backgrounds (`#09090b`, `#0f0f12`) contrasted with vivid crimson red (`#dc2626`, `#ef4444`) accents.
   - Glassmorphism effects and modern card designs for the library, stats, and settings pages.
2. **Advanced EPUB Reader**
   - Seamless parsing and rendering of `.epub` files via `epub.js`.
   - Customizable reading experience: Font size adjustments, font family selection, and publisher CSS overrides.
   - Highlighting (multi-color) and Bookmarking with exact CFI tracking.
   - Built-in Dictionary popover (offline-ready dictionary mappings).
3. **Library Management**
   - Organization features including customizable Tags and Bookshelves.
   - Reading states: `plan_to_read`, `reading`, and `completed`.
   - Automatic metadata and cover extraction using `JSZip` upon upload.
4. **Analytics & Reading Stats**
   - Session tracking (date, duration, WPM).
   - Daily reading streaks and goals.
   - Reading history heatmap and visual charts.
5. **Offline Support & Sync**
   - EPUB files are cached in IndexedDB via `localforage` for instantaneous offline access.
   - `OfflineQueue`: Actions performed while offline (updating progress, adding highlights) are queued and synced to Supabase when the connection is restored.
   - **Cross-device Realtime Sync**: Uses Supabase Realtime channels to broadcast reading progress (CFI) so users can resume reading seamlessly on another device.
6. **AI Tools**
   - *AI Recap*: A feature to summarize the story up to the user's current reading position (Note: currently uses a mocked API response).

---

## 📂 Project Architecture

```
/
├── src/
│   ├── app/                    # Next.js App Router (Pages & API)
│   │   ├── (authenticated)/    # Protected routes: /library, /read, /shelf, /stats, /history, /settings
│   │   ├── actions/            # Server Actions (reader, library, stats)
│   │   ├── api/                # API Routes (e.g., /api/recap)
│   │   ├── dev-login/          # Local dev helper for quick sign-in
│   │   └── dev-reader/         # Local dev helper for testing EPUB rendering
│   │
│   ├── components/             # UI Components
│   │   ├── books/              # Book cards, progress rings
│   │   ├── history/            # Heatmaps, activity logs
│   │   ├── layout/             # App shell, sidebar, bottom navigation
│   │   ├── library/            # AI recap dialog, tags/shelves managers
│   │   ├── reader/             # Core EPUB reader, toolbars, popovers (highlights/dictionary)
│   │   └── upload/             # Book uploader and parsing logic
│   │
│   └── lib/                    # Core Utilities & Hooks
│       ├── supabase/           # Browser, server, and proxy Supabase clients
│       ├── epub-cache.ts       # IndexedDB caching logic
│       ├── offline-queue.ts    # Background sync logic for offline actions
│       ├── epub-utils.ts       # Metadata and cover extraction
│       └── dictionary.ts       # Dictionary data mapping
│
└── supabase/
    └── migrations/             # SQL schemas and migration scripts
```

---

## 🗄 Database Schema (Supabase)

The database utilizes Row Level Security (RLS) to ensure users can only access their own data.

### Core Tables
- `profiles`: Extends Supabase `auth.users`. Stores user preferences like `daily_goal_minutes`.
- `books`: Stores global book information (title, author, cover URL, storage path).
- `user_books`: The mapping between users and books (The "Shelf"). Tracks `status`, `current_cfi`, `progress_percentage`, and `last_read_at`.
- `reading_sessions`: Analytics data tracking `start_time`, `end_time`, `duration_minutes`, and `words_read`.

### Annotations
- `highlights`: Stores highlighted text selections. Includes `cfi_range`, `color`, `text` (snippet), and `note`.
- `bookmarks`: Points of interest saved by the user with exact `cfi` locations.

### Organization
- `tags` & `book_tags`: User-defined tags (with colors) mapped to books.
- `shelves` & `shelf_books`: User-defined collections mapped to books.

### Storage Buckets
- `epubs`: **Private** bucket containing the raw `.epub` files.
- `covers`: **Public** bucket containing compressed cover images.

---

## 🚀 Local Development Guide

### 1. Prerequisites
- Node.js (LTS)
- A Supabase project (local or hosted)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file at the root:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

### 4. Supabase Setup
Run the SQL migrations located in `supabase/migration.sql`, `supabase/phase1.sql`, `supabase/phase2.sql`, `supabase/phase3.sql`, and the files in `supabase/migrations/` in your Supabase SQL editor in order.

Ensure the storage buckets (`epubs` and `covers`) are created (the SQL scripts should handle this).

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## ⚠️ Known Limitations & Mocks
- **AI Recap Feature**: The `/api/recap` endpoint is currently mocked via a timeout and returns a static string. To make it functional, it needs to be integrated with an LLM (like Claude or OpenAI) and provided with the extracted text from the EPUB.
- **EPUB Parsing**: Highly complex or severely malformed EPUB files might occasionally fail to render perfectly via `epub.js`, especially if they rely on non-standard DRM or heavily embedded custom scripts. DRM detection exists but is basic.

---
*Generated as a comprehensive reference guide to facilitate future AI-assisted development cycles.*

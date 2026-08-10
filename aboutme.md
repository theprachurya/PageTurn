# PageTurn E-Reader

PageTurn is a modern, web-based e-reader application designed to give you a premium reading experience straight from your browser. Built with a focus on beautiful aesthetics, seamless cross-device syncing, and reading analytics.

## 🛠️ Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4 + shadcn/ui components
- **Database & Auth:** Supabase (PostgreSQL, Storage, Google OAuth)
- **Reading Engine:** epub.js

---

## ✨ What it CAN do right now

### Library & Book Management
* **Upload EPUBs:** Drag and drop your personal `.epub` files directly into your library.
* **Smart Metadata Extraction:** Automatically parses the book's Title, Author, Description, and extracts the Cover Image purely on the client side using JSZip.
* **Organization:** View your books in a responsive Grid or List layout.
* **Shelf View:** A dynamic dashboard that highlights the book you are currently reading so you can jump right back in, alongside a list of recently opened books.

### The Reading Experience
* **Customizable Engine:** Read seamlessly via the `epub.js` rendering engine.
* **Themes & Fonts:** Toggle between Light, Dark, and Sepia themes. Adjust font sizes and choose between Serif, Sans-serif, and OpenDyslexic font families.
* **Layouts:** Read in a traditional Paginated layout (swiping left/right) or toggle to a Continuous Scroll layout (scrolling vertically).
* **Navigation:** Access a slide-out Table of Contents sidebar to instantly jump to specific chapters.
* **Progress Syncing:** Automatically tracks your reading progress (percentage and exact location) and syncs it to the cloud so you can pick up exactly where you left off on another device.

### History & Analytics
* **Session Tracking:** Automatically logs reading sessions in the background if you read for more than 30 seconds, tracking the chapter read and duration spent.
* **Contribution Heatmap:** A GitHub-style calendar visualizing your reading consistency over the past 20 weeks.
* **Daily Goals:** Set a custom daily reading goal (in minutes) and track your progress with a visual ring.

---

## 🚧 What it CANNOT do right now (Limitations & Future Ideas)

### Format Restrictions
* **No PDF or MOBI Support:** The app relies on `epub.js` and currently only supports standard, DRM-free `.epub` files. It cannot read PDFs, MOBIs, or Amazon AZW3 files.
* **DRM Protection:** Cannot open encrypted or DRM-protected books.

### Reader Features
* **No Highlights or Annotations:** You cannot highlight text, add custom notes, or place manual bookmarks inside a book.
* **No Dictionary/Search:** Does not currently support word definitions, translations, or full-text search within a book.

### Infrastructure
* **No Offline Mode (PWA):** The app requires an active internet connection to download the EPUB file from Supabase Storage and sync your progress. It cannot currently be installed as an offline Progressive Web App.
* **Real-time Sync:** While progress syncs to the cloud securely, it happens on an interval. If you have the book open on two devices simultaneously, it won't push updates in real-time between them via WebSockets.
* **No Social Features:** The app is entirely private. There are no features to share your reading progress, write public reviews, or follow friends.

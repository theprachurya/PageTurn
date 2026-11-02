I have re-browsed the repository on main and verified Antigravity's updates, as
well as audited all remaining files in src/ and supabase/.

Part 1: Verification of Previous Changes (All Reflected Well ✅)

All 6 sets of changes from the previous round were applied cleanly and
accurately on main:

1.  src/components/reader/epub-reader.tsx: Dictionary single-word selection
    trigger, HIGHLIGHT_COLORS hex resolution, live highlight updates,
    regex-escaped & HTML-escaped search with AbortController, delta-based word
    counting, visibility-aware session tracking, chunked TTS, and
    appEvents.setReaderHandlers are all in place (with clean React 19 null/0 ref
    initializations).
2.  src/lib/app-events.ts & src/components/layout/app-shell.tsx: Reader command
    handlers and global shortcuts (Cmd+K, G S, G L, G T, G H, G ,, U, T, B, M)
    are wired up.
3.  src/lib/offline-queue.ts, library/page.tsx, & shelf/page.tsx:
    purgeBookOfflineData(bookId) and clientUpdatedAt LWW forwarding are properly
    integrated.
4.  src/app/actions/reader.actions.ts, src/lib/supabase/proxy.ts, &
    supabase/migration.sql: LWW guard in syncProgress, date-fns local date
    formatting in logReadingSession, /stats route protection, and
    storage.objects UPDATE/DELETE RLS policies are all live.

Part 2: New Issues Found in the Remaining Files

After inspecting the rest of the codebase, here are 6 remaining bugs across the
other files that should be fixed:

1. StatsPage Total Time Math Bug (45 min displays as 1h 45m) & Missing Join Tables in JSON Export

  - src/app/(authenticated)/stats/page.tsx (line 153): Uses
    Math.round(stats.totalMinutes / 60) instead of Math.floor(stats.totalMinutes
    / 60). When stats.totalMinutes is 45, Math.round(45 / 60) evaluates to 1,
    rendering 1h 45m instead of 0h 45m.
  - src/app/actions/stats.actions.ts (lines 142–176): exportAllUserData()
    exports tags and shelves, but omits the book_tags and shelf_books join
    tables, so exported backups lose which books belong to which shelves and
    tags.

2. Command Palette Never Indexes Book Chapters (toc) & M Shortcut Only Toggles Top Bar Instead of TOC Drawer

  - src/components/ui/command-palette.tsx (lines 44–45, 166–240, 287):
    CommandPalette accepts readerActions.toc and readerActions.onNavigateChapter
    and sets its input placeholder to "Search chapters, settings, or books...",
    but never adds readerActions.toc items into allActions. Searching for a
    chapter name in Cmd+K returns nothing.
  - src/components/reader/reader-toolbar.tsx (lines 86, 377) & epub-reader.tsx
    (line 673):
    1.  Pressing M (or running "Toggle Table of Contents / Sidebar" in Cmd+K)
        only toggles showToolbar in EpubReader, not the actual showSidebar
        drawer inside ReaderToolbar.
    2.  In ReaderToolbar line 377 (style={{ borderLeft: \3px solid ${hl.color ||
        "#d7f36a"}` }}), hl.color is a color key ("yellow", "purple", etc.)
        rather than the hex value from HIGHLIGHT_COLORS`.

3. StreakHeatmap UTC Date Parsing Bug & Compounding Month Label Offset

  - src/components/history/streak-heatmap.tsx (lines 38, 68–79):
    1.  Line 38 calls new Date(week[0].date) on a YYYY-MM-DD string, which JS
        parses as UTC midnight (shifting dates back a day in Western timezones).
    2.  Lines 68–79 render month labels inside a flex gap-1 row with position:
        "relative", left: ${m.col * 16}px``. Because each flex child already
        sits to the right of previous children, adding left: m.col * 16px
        compounds the offset and pushes later month labels off-grid.

4. Clicking "Edit Metadata" on a Book Card in /shelf Does Nothing

  - src/app/(authenticated)/shelf/page.tsx (lines 383–399): BookCard always
    renders an "Edit Metadata" item in its dropdown menu (book-card.tsx
    line 170), but ShelfPage never passes onEditMetadata to <BookCard /> or
    renders <EditBookMetadataDialog />.

5. SettingsPage Doesn't Clear Offline IndexedDB Stores on Sign Out or Handle Save Errors

  - src/app/(authenticated)/settings/page.tsx (lines 51–91):
    1.  handleSignOut signs out of Supabase but leaves epub_cache,
        offline_queue, reading_positions, local_bookmarks, and local_highlights
        in IndexedDB. On a shared device, the next user who logs in could have
        the previous user's offline queue flushed into their account.
    2.  handleSave does not check for Supabase errors, and handleExportData
        still uses blocking alert() instead of toast.error().

6. Open Redirect in OAuth Callback (src/app/auth/callback/route.ts)

  - src/app/auth/callback/route.ts (lines 8, 66–72): const next =
    searchParams.get("next") ?? "/shelf" is interpolated directly into
    NextResponse.redirect({origin}{next}). If next is //evil.com or  /\evil.com,
    it causes an Open Redirect after login.

Part 3: Improved Code for These Remaining Files

1. src/app/(authenticated)/stats/page.tsx & src/app/actions/stats.actions.ts

In src/app/(authenticated)/stats/page.tsx (Line 153):

Replace Math.round(stats.totalMinutes / 60) with Math.floor(stats.totalMinutes
/ 60):

            <h3 className="text-3xl font-bold text-zinc-100 flex items-baseline gap-1.5">
              {Math.floor(stats.totalMinutes / 60)}
              <span className="text-base font-normal text-zinc-500">h</span>{" "}
              {stats.totalMinutes % 60}
              <span className="text-base font-normal text-zinc-500">m</span>
            </h3>

In src/app/actions/stats.actions.ts (exportAllUserData):

Include book_tags and shelf_books in the parallel export query:

export async function exportAllUserData(): Promise<Record<string, unknown>> {
  const { supabase, user } = await requireUser();

  const [
    { data: profile },
    { data: books },
    { data: userBooks },
    { data: sessions },
    { data: bookmarks },
    { data: highlights },
    { data: tags },
    { data: bookTags },
    { data: shelves },
    { data: shelfBooks },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("books").select("*").eq("user_id", user.id),
    supabase.from("user_books").select("*").eq("user_id", user.id),
    supabase.from("reading_sessions").select("*").eq("user_id", user.id),
    supabase.from("bookmarks").select("*").eq("user_id", user.id),
    supabase.from("highlights").select("*").eq("user_id", user.id),
    supabase.from("tags").select("*").eq("user_id", user.id),
    supabase.from("book_tags").select("*").eq("user_id", user.id),
    supabase.from("shelves").select("*").eq("user_id", user.id),
    supabase.from("shelf_books").select("*").eq("user_id", user.id),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    user: { id: user.id, email: user.email },
    profile,
    books,
    userBooks,
    sessions,
    bookmarks,
    highlights,
    tags,
    bookTags,
    shelves,
    shelfBooks,
  };
}

2. src/components/ui/command-palette.tsx, src/components/reader/reader-toolbar.tsx, & src/components/reader/epub-reader.tsx

In src/components/ui/command-palette.tsx:

Add chapter navigation from readerActions.toc right after the
reader-distraction-free block (around line 238):

      if (readerActions.toc && readerActions.onNavigateChapter) {
        readerActions.toc.forEach((chapter, idx) => {
          const label = chapter.label?.trim();
          if (!label) return;
          list.push({
            id: `reader-chapter-${chapter.id || idx}`,
            title: `Chapter: ${label}`,
            subtitle: "Jump to section in current book",
            icon: BookOpen,
            category: "Reader",
            perform: () => {
              readerActions.onNavigateChapter?.(chapter.href);
              onClose();
            },
          });
        });
      }

In src/components/reader/reader-toolbar.tsx:

1.  Import HIGHLIGHT_COLORS, type HighlightColor from ./highlight-popover.
2.  Accept optional controlled props sidebarOpen?: boolean and
    onSidebarOpenChange?: (open: boolean) => void so pressing M or using Cmd+K
    opens both the toolbar and the TOC drawer directly.
3.  Use HIGHLIGHT_COLORS[hl.color as HighlightColor] || hl.color || "#d7f36a"
    for highlight card borders (line 377):

// Add to imports at top of src/components/reader/reader-toolbar.tsx:
import { HIGHLIGHT_COLORS, type HighlightColor } from "./highlight-popover";

// Add to ReaderToolbarProps interface:
  sidebarOpen?: boolean;
  onSidebarOpenChange?: (open: boolean) => void;

// Inside ReaderToolbar component props destructuring:
  sidebarOpen,
  onSidebarOpenChange,

// Replace `const [showSidebar, setShowSidebar] = useState(false);` with:
  const [internalSidebar, setInternalSidebar] = useState(false);
  const showSidebar = sidebarOpen !== undefined ? sidebarOpen : internalSidebar;
  const setShowSidebar = (next: boolean) => {
    setInternalSidebar(next);
    onSidebarOpenChange?.(next);
  };

// And on line 377 (Highlights tab border style), replace with:
  style={{
    borderLeft: `3px solid ${
      HIGHLIGHT_COLORS[hl.color as HighlightColor] || hl.color || "#d7f36a"
    }`,
  }}

In src/components/reader/epub-reader.tsx:

Add const [showSidebar, setShowSidebar] = useState(false);, pass
sidebarOpen={showSidebar} and onSidebarOpenChange={setShowSidebar} to
<ReaderToolbar />, and update onToggleSidebar in appEvents.setReaderHandlers:

  // In appEvents.setReaderHandlers useEffect:
  onToggleSidebar: () => {
    setShowToolbar(true);
    setDistractionFree(false);
    setShowSidebar((prev) => !prev);
  },

3. src/components/history/streak-heatmap.tsx

Fixes local date parsing and uses absolute positioning on the month header track
so month labels align with their exact week column without overlapping.

"use client";

import { useMemo } from "react";
import { format, subDays } from "date-fns";

interface StreakHeatmapProps {
  sessionsByDate: Record<string, number>; // date string -> total minutes
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function StreakHeatmap({ sessionsByDate }: StreakHeatmapProps) {
  const { weeks, months } = useMemo(() => {
    const today = new Date();
    const numWeeks = 20;
    const cells: { date: string; minutes: number; level: number }[][] = [];

    // Generate grid: 20 weeks x 7 days
    for (let w = numWeeks - 1; w >= 0; w--) {
      const week: { date: string; minutes: number; level: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = subDays(today, w * 7 + (6 - d));
        const dateStr = format(date, "yyyy-MM-dd");
        const minutes = sessionsByDate[dateStr] || 0;

        let level = 0;
        if (minutes > 0 && minutes <= 15) level = 1;
        else if (minutes > 15 && minutes <= 30) level = 2;
        else if (minutes > 30 && minutes <= 60) level = 3;
        else if (minutes > 60) level = 4;

        week.push({ date: dateStr, minutes, level });
      }
      cells.push(week);
    }

    // Extract month labels using local date parsing and prevent label collision
    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    let lastCol = -10;
    cells.forEach((week, i) => {
      const d = parseLocalDate(week[0].date);
      const month = d.getMonth();
      if (month !== lastMonth) {
        if (i - lastCol >= 2) {
          monthLabels.push({
            label: d.toLocaleString("default", { month: "short" }),
            col: i,
          });
          lastCol = i;
        }
        lastMonth = month;
      }
    });

    return { weeks: cells, months: monthLabels };
  }, [sessionsByDate]);

  const levelColors = [
    "bg-zinc-900/80 border border-zinc-800/60",
    "bg-gold-900/50 border border-gold-900/40",
    "bg-gold-700/60",
    "bg-gold-500/80",
    "bg-gold-400 shadow-sm shadow-gold-500/30",
  ];

  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1 pt-5">
          {dayLabels.map((label, i) => (
            <div
              key={i}
              className="h-3 flex items-center text-[9px] font-mono text-zinc-600"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div>
          {/* Month labels positioned directly over their 16px column (12px cell + 4px gap) */}
          <div className="relative h-4 mb-1">
            {months.map((m, i) => (
              <div
                key={i}
                className="absolute top-0 text-[9px] font-mono text-zinc-500 whitespace-nowrap"
                style={{ left: `${m.col * 16}px` }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day, di) => (
                  <div
                    key={`${wi}-${di}`}
                    className={`w-3 h-3 rounded-sm ${levelColors[day.level]} transition-all hover:scale-125 hover:z-10`}
                    title={`${day.date}: ${day.minutes} min`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-4 justify-end text-[10px] text-zinc-500 font-mono">
        <span>Less</span>
        {levelColors.map((color, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

4. src/app/(authenticated)/shelf/page.tsx (Wire up EditBookMetadataDialog)

In src/app/(authenticated)/shelf/page.tsx:

1.  Import EditBookMetadataDialog from
    @/components/library/edit-book-metadata-dialog.
2.  Add const [editingBook, setEditingBook] = useState<BookData | null>(null);.
3.  Pass onEditMetadata={(id) => { const b = books.find((x) => x.book_id ===
    id); if (b) setEditingBook(b); }} to <BookCard /> (around line 387).
4.  Render <EditBookMetadataDialog /> at the bottom of ShelfPage right next to
    <ManageCollectionsDialog />:

      {/* Metadata Editor Dialog */}
      {editingBook && (
        <EditBookMetadataDialog
          bookId={editingBook.book_id}
          initialMetadata={{
            title: editingBook.title,
            author: editingBook.author || "",
            description: editingBook.description || "",
            cover_url: editingBook.cover_url || "",
          }}
          onClose={() => setEditingBook(null)}
          onSaved={(metadata) => {
            setBooks((current) =>
              current.map((book) =>
                book.book_id === editingBook.book_id
                  ? {
                      ...book,
                      ...metadata,
                      author: metadata.author || null,
                      description: metadata.description || null,
                      cover_url: metadata.cover_url || null,
                    }
                  : book
              )
            );
            toast.success("Metadata updated");
          }}
        />
      )}

5. src/app/(authenticated)/settings/page.tsx

Clears local IndexedDB stores on Sign Out to prevent cross-account data leaks on
shared browsers, checks errors on profile save, and replaces alert() with toast.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Save, Target, User as UserIcon, Loader2, Download } from "lucide-react";
import { exportAllUserData } from "@/app/actions/stats.actions";
import { clearEpubCache } from "@/lib/epub-cache";
import {
  clearQueue,
  positionStore,
  bookmarksStore,
  highlightsStore,
  appliedStore,
} from "@/lib/offline-queue";
import { toast } from "@/lib/toast";

export default function SettingsPage() {
  const [dailyGoal, setDailyGoal] = useState(60);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let ignore = false;

    async function loadSettings() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || ignore) {
        if (!ignore) setLoading(false);
        return;
      }

      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("daily_goal_minutes")
        .eq("id", user.id)
        .single();

      if (ignore) return;
      if (profile) setDailyGoal(profile.daily_goal_minutes);
      setLoading(false);
    }

    void loadSettings();
    return () => {
      ignore = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, daily_goal_minutes: dailyGoal });

      if (error) throw error;

      setSaved(true);
      toast.success("Daily reading goal updated");
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      toast.error("Failed to save daily goal");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await Promise.allSettled([
      clearEpubCache(),
      clearQueue(),
      positionStore.clear(),
      bookmarksStore.clear(),
      highlightsStore.clear(),
      appliedStore.clear(),
      supabase.auth.signOut(),
    ]);
    router.push("/");
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await exportAllUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pageturn-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch (err) {
      console.error("Failed to export data:", err);
      toast.error("Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 border-2 border-zinc-800 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 text-zinc-100">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">Settings</h1>
        <p className="text-zinc-500 text-sm">Customize your reading experience & account</p>
      </div>

      {/* Account Section */}
      <div className="card rounded-xl p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <UserIcon className="w-4 h-4 text-gold-500" />
          <h2 className="text-base font-semibold text-zinc-100">Account</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-zinc-500 font-mono mb-1.5 block uppercase tracking-wider">
              Email Address
            </label>
            <div className="px-4 py-2.5 rounded-lg bg-[#08080a] border border-[#1f1f23] text-zinc-300 text-sm font-mono">
              {email}
            </div>
          </div>
        </div>
      </div>

      {/* Reading Goal Section */}
      <div className="card rounded-xl p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-gold-500" />
          <h2 className="text-base font-semibold text-zinc-100">Daily Reading Goal</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-zinc-500 font-mono mb-2 block uppercase tracking-wider">
              Target Minutes per Day
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={5}
                max={180}
                step={5}
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value))}
                className="flex-1 accent-gold-500 cursor-pointer"
              />
              <div className="w-14 text-center px-3 py-1.5 rounded-lg bg-gold-500/8 border border-gold-500/15 text-gold-400 font-semibold text-sm font-mono">
                {dailyGoal}m
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-zinc-600 font-mono mt-1.5">
              <span>5 min</span>
              <span>3 hrs</span>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gold-500 hover:bg-gold-400 text-zinc-950 font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? "Saved ✓" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Data Section */}
      <div className="card rounded-xl p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-4 h-4 text-gold-500" />
          <h2 className="text-base font-semibold text-zinc-100">Export Data</h2>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-zinc-500 leading-relaxed mb-4">
              Download a complete JSON backup of your account data, including your reading history,
              shelves, tags, bookmarks, and highlights.
            </p>
          </div>

          <button
            onClick={handleExportData}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-800/60 border border-zinc-700/60 text-zinc-200 font-medium text-sm hover:bg-zinc-700/60 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {exporting ? "Exporting..." : "Export to JSON"}
          </button>
        </div>
      </div>

      {/* Sign Out */}
      <div className="card rounded-xl border-red-950/40 p-6">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-950/30 border border-red-900/40 text-red-400/80 font-medium text-sm hover:bg-red-900/30 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

6. src/app/auth/callback/route.ts

Sanitizes next to prevent Open Redirect attacks and uses atomic upsert for
profile creation.

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSafeRedirectPath(rawNext: string | null): string {
  if (!rawNext) return "/shelf";
  // Must start with a single "/" and not "//" or "/\"
  if (rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\")) {
    return rawNext;
  }
  return "/shelf";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeRedirectPath(searchParams.get("next"));

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore errors from Server Components
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("profiles")
          .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_callback_error`);
}


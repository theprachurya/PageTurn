"use server";

import { requireUser } from "@/lib/supabase/require-user";

// ─── Progress ──────────────────────────────────────────────────

export async function syncProgress(
  bookId: string,
  cfi: string,
  progressPercentage: number
) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("user_books")
    .update({
      current_cfi: cfi,
      progress_percentage: Math.min(progressPercentage, 100),
      last_read_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("book_id", bookId);

  if (error) throw new Error(`Failed to sync progress: ${error.message}`);
}

// ─── Sessions ──────────────────────────────────────────────────

export async function logReadingSession(
  bookId: string,
  startTime: string,
  endTime: string,
  durationMinutes: number,
  chapterName: string | null,
  wordsRead: number = 0
) {
  const { supabase, user } = await requireUser();

  const sessionDate = new Date(endTime).toISOString().split("T")[0];

  const { error } = await supabase.from("reading_sessions").insert({
    user_id: user.id,
    book_id: bookId,
    session_date: sessionDate,
    start_time: startTime,
    end_time: endTime,
    duration_minutes: durationMinutes,
    chapter_name: chapterName,
    words_read: wordsRead,
  });

  if (error) throw new Error(`Failed to log session: ${error.message}`);

  // Also update last_read_at to ensure history stays in sync with sessions
  await supabase
    .from("user_books")
    .update({ last_read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("book_id", bookId);
}

// ─── Bookmarks ─────────────────────────────────────────────────

export async function addBookmark(
  bookId: string,
  cfi: string,
  label: string,
  id?: string,
  createdAt?: string
) {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("bookmarks")
    .upsert({
      ...(id ? { id } : {}),
      user_id: user.id,
      book_id: bookId,
      cfi,
      label,
      ...(createdAt ? { created_at: createdAt } : {}),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add bookmark: ${error.message}`);
  return data;
}

export async function removeBookmark(bookmarkId: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("id", bookmarkId)
    .eq("user_id", user.id);

  if (error) throw new Error(`Failed to remove bookmark: ${error.message}`);
}

export async function getBookmarks(bookId: string) {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("book_id", bookId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to get bookmarks: ${error.message}`);
  return data;
}

// ─── Highlights ────────────────────────────────────────────────

export async function addHighlight(
  bookId: string,
  cfiRange: string,
  color: string,
  note: string | null,
  id?: string,
  text?: string,
  createdAt?: string
) {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("highlights")
    .upsert({
      ...(id ? { id } : {}),
      user_id: user.id,
      book_id: bookId,
      cfi_range: cfiRange,
      color,
      note,
      text,
      ...(createdAt ? { created_at: createdAt } : {}),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add highlight: ${error.message}`);
  return data;
}

export async function updateHighlight(
  highlightId: string,
  updates: { color?: string; note?: string | null }
) {
  const { supabase, user } = await requireUser();
  const updateData: { color?: string; note?: string | null } = {};
  if (updates.color !== undefined) updateData.color = updates.color;
  if (updates.note !== undefined) updateData.note = updates.note;

  if (Object.keys(updateData).length === 0) return { success: true };

  const { error } = await supabase
    .from("highlights")
    .update(updateData)
    .eq("id", highlightId)
    .eq("user_id", user.id);

  if (error) throw new Error(`Failed to update highlight: ${error.message}`);
  return { success: true };
}

export async function removeHighlight(highlightId: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("highlights")
    .delete()
    .eq("id", highlightId)
    .eq("user_id", user.id);

  if (error) throw new Error(`Failed to remove highlight: ${error.message}`);
}

export async function getHighlights(bookId: string) {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("highlights")
    .select("*")
    .eq("book_id", bookId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to get highlights: ${error.message}`);
  return data;
}

// ─── Cross-book notebook ──────────────────────────────────────

export async function getReadingNotebook() {
  const { supabase, user } = await requireUser();

  const [highlightsResult, bookmarksResult] = await Promise.all([
    supabase
      .from("highlights")
      .select("id, book_id, cfi_range, color, note, text, created_at, books (title, author, cover_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("bookmarks")
      .select("id, book_id, cfi, label, created_at, books (title, author, cover_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  if (highlightsResult.error) throw new Error(`Failed to load highlights: ${highlightsResult.error.message}`);
  if (bookmarksResult.error) throw new Error(`Failed to load bookmarks: ${bookmarksResult.error.message}`);

  const highlights = (highlightsResult.data || []).map((item) => {
    const book = item.books as unknown as { title?: string | null; author?: string | null; cover_url?: string | null } | null;
    return {
      id: item.id,
      bookId: item.book_id,
      bookTitle: book?.title || "Untitled book",
      author: book?.author || null,
      coverUrl: book?.cover_url || null,
      cfi: item.cfi_range,
      createdAt: item.created_at || new Date(0).toISOString(),
      kind: "highlight" as const,
      color: item.color,
      text: item.text || "",
      note: item.note || "",
      label: "",
    };
  });
  const bookmarks = (bookmarksResult.data || []).map((item) => {
    const book = item.books as unknown as { title?: string | null; author?: string | null; cover_url?: string | null } | null;
    return {
      id: item.id,
      bookId: item.book_id,
      bookTitle: book?.title || "Untitled book",
      author: book?.author || null,
      coverUrl: book?.cover_url || null,
      cfi: item.cfi,
      createdAt: item.created_at || new Date(0).toISOString(),
      kind: "bookmark" as const,
      color: "",
      text: "",
      note: "",
      label: item.label || "Bookmark",
    };
  });

  return [...highlights, ...bookmarks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

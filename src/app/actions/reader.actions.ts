"use server";

import { createClient } from "@/lib/supabase/server";

// ─── Progress ──────────────────────────────────────────────────

export async function syncProgress(
  bookId: string,
  cfi: string,
  progressPercentage: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

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
}

// ─── Bookmarks ─────────────────────────────────────────────────

export async function addBookmark(
  bookId: string,
  cfi: string,
  label: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("bookmarks")
    .insert({
      user_id: user.id,
      book_id: bookId,
      cfi,
      label,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add bookmark: ${error.message}`);
  return data;
}

export async function removeBookmark(bookmarkId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("id", bookmarkId)
    .eq("user_id", user.id);

  if (error) throw new Error(`Failed to remove bookmark: ${error.message}`);
}

export async function getBookmarks(bookId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

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
  note: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("highlights")
    .insert({
      user_id: user.id,
      book_id: bookId,
      cfi_range: cfiRange,
      color,
      note,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add highlight: ${error.message}`);
  return data;
}

export async function removeHighlight(highlightId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("highlights")
    .delete()
    .eq("id", highlightId)
    .eq("user_id", user.id);

  if (error) throw new Error(`Failed to remove highlight: ${error.message}`);
}

export async function getHighlights(bookId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("highlights")
    .select("*")
    .eq("book_id", bookId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to get highlights: ${error.message}`);
  return data;
}

"use server";

import { requireUser } from "@/lib/supabase/require-user";

export type BookStatus = "plan_to_read" | "reading" | "completed";

export interface BookMetadata {
  title: string;
  author: string;
  description: string;
  cover_url: string;
}

// ==========================================
// Book Metadata Actions
// ==========================================

export async function updateBookMetadata(bookId: string, metadata: BookMetadata) {
  const { supabase, user } = await requireUser();

  const title = metadata.title.trim();
  if (!title) throw new Error("Book title is required");

  const { error } = await supabase
    .from("books")
    .update({
      title,
      author: metadata.author.trim() || null,
      description: metadata.description.trim() || null,
      cover_url: metadata.cover_url.trim() || null,
    })
    .eq("id", bookId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  return { success: true };
}

// ==========================================
// Reading Status Actions
// ==========================================

export async function updateReadingStatus(bookId: string, status: BookStatus) {
  const { supabase, user } = await requireUser();
  const updateData: {
    status: BookStatus;
    completed_at?: string | null;
    progress_percentage?: number;
    current_cfi?: string | null;
  } = { status };
  
  if (status === "completed") {
    updateData.completed_at = new Date().toISOString();
    updateData.progress_percentage = 100;
  } else if (status === "plan_to_read") {
    updateData.progress_percentage = 0;
    updateData.current_cfi = null;
    updateData.completed_at = null;
  }

  const { error } = await supabase
    .from("user_books")
    .update(updateData)
    .eq("book_id", bookId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  return { success: true };
}

// ==========================================
// Tags Actions
// ==========================================

export async function createTag(name: string, color: string = "#9333ea") {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("tags")
    .insert({ user_id: user.id, name, color })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTag(tagId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("tags")
    .delete()
    .eq("id", tagId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function applyTagToBook(bookId: string, tagId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("book_tags")
    .insert({ book_id: bookId, tag_id: tagId, user_id: user.id });

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function removeTagFromBook(bookId: string, tagId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("book_tags")
    .delete()
    .eq("book_id", bookId)
    .eq("tag_id", tagId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  return { success: true };
}

// ==========================================
// Shelves Actions
// ==========================================

export async function createShelf(name: string, description: string = "") {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("shelves")
    .insert({ user_id: user.id, name, description })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteShelf(shelfId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("shelves")
    .delete()
    .eq("id", shelfId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function addBookToShelf(bookId: string, shelfId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("shelf_books")
    .insert({ book_id: bookId, shelf_id: shelfId, user_id: user.id });

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function removeBookFromShelf(bookId: string, shelfId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("shelf_books")
    .delete()
    .eq("book_id", bookId)
    .eq("shelf_id", shelfId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  return { success: true };
}

// ==========================================
// Delete Book Action
// ==========================================

export async function deleteBook(bookId: string) {
  const { supabase, user } = await requireUser();

  // Fetch book record to obtain file paths for storage cleanup
  const { data: book } = await supabase
    .from("books")
    .select("epub_path, cover_url")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .maybeSingle();

  // Cascade database deletes
  await supabase.from("reading_sessions").delete().eq("book_id", bookId).eq("user_id", user.id);
  await supabase.from("bookmarks").delete().eq("book_id", bookId).eq("user_id", user.id);
  await supabase.from("highlights").delete().eq("book_id", bookId).eq("user_id", user.id);
  await supabase.from("book_tags").delete().eq("book_id", bookId).eq("user_id", user.id);
  await supabase.from("shelf_books").delete().eq("book_id", bookId).eq("user_id", user.id);
  await supabase.from("user_books").delete().eq("book_id", bookId).eq("user_id", user.id);
  const { error } = await supabase.from("books").delete().eq("id", bookId).eq("user_id", user.id);

  if (error) throw new Error(error.message);

  // Clean up storage files if they existed
  if (book?.epub_path) {
    try {
      await supabase.storage.from("epubs").remove([book.epub_path]);
    } catch {
      // Non-critical cleanup
    }
  }

  if (book?.cover_url) {
    try {
      const match = book.cover_url.split("/covers/")[1];
      if (match) {
        await supabase.storage.from("covers").remove([decodeURIComponent(match)]);
      }
    } catch {
      // Non-critical cleanup
    }
  }

  return { success: true };
}

"use server";

import { requireUser } from "@/lib/supabase/require-user";

export type BookStatus = "plan_to_read" | "reading" | "completed";


// ==========================================
// Reading Status Actions
// ==========================================

export async function updateReadingStatus(bookId: string, status: BookStatus) {
  const { supabase, user } = await requireUser();
  const updateData: Record<string, any> = { status };
  
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

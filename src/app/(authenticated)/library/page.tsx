"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { LayoutGrid, List, Trash2 } from "lucide-react";
import { BookCard, type BookData } from "@/components/books/book-card";
import { BookUploader } from "@/components/upload/book-uploader";
import { cn } from "@/lib/utils";
import type { SupabaseClient } from "@supabase/supabase-js";

export default function LibraryPage() {
  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const supabaseRef = useRef<SupabaseClient | null>(null);
  if (!supabaseRef.current && typeof window !== "undefined") {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current!;

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_books")
      .select(
        `
        id,
        book_id,
        status,
        current_cfi,
        progress_percentage,
        last_read_at,
        books (
          id,
          title,
          author,
          description,
          cover_url
        )
      `
      )
      .eq("user_id", user.id)
      .order("last_read_at", { ascending: false });

    if (data) {
      const mapped = data.map((ub: Record<string, unknown>) => {
        const book = ub.books as Record<string, unknown>;
        return {
          id: ub.id as string,
          book_id: ub.book_id as string,
          title: (book?.title as string) || "Unknown",
          author: (book?.author as string) || null,
          description: (book?.description as string) || null,
          cover_url: (book?.cover_url as string) || null,
          progress_percentage: Number(ub.progress_percentage) || 0,
          current_cfi: (ub.current_cfi as string) || null,
          last_read_at: (ub.last_read_at as string) || null,
          status: (ub.status as string) || "reading",
        };
      });
      setBooks(mapped);
    }
    setLoading(false);
  };

  const handleDelete = async (bookId: string) => {
    if (!confirm("Are you sure you want to remove this book?")) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Delete user_books record
    await supabase
      .from("user_books")
      .delete()
      .eq("book_id", bookId)
      .eq("user_id", user.id);

    // Delete book record (cascading will clean up reading sessions)
    await supabase.from("books").delete().eq("id", bookId).eq("user_id", user.id);

    fetchBooks();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-1">Library</h1>
          <p className="text-slate-500">
            {books.length} {books.length === 1 ? "book" : "books"} in your
            collection
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-purple-50 rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-lg transition-all cursor-pointer",
                viewMode === "grid"
                  ? "bg-white shadow-sm text-purple-600"
                  : "text-slate-400 hover:text-purple-500"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-lg transition-all cursor-pointer",
                viewMode === "list"
                  ? "bg-white shadow-sm text-purple-600"
                  : "text-slate-400 hover:text-purple-500"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <BookUploader onUploadComplete={fetchBooks} />
        </div>
      </div>

      {/* Books */}
      {books.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 rounded-3xl bg-purple-100 flex items-center justify-center mx-auto mb-6">
            <LayoutGrid className="w-10 h-10 text-purple-300" />
          </div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">
            No books yet
          </h2>
          <p className="text-slate-400 mb-6">
            Upload your first EPUB to build your library
          </p>
          <BookUploader onUploadComplete={fetchBooks} />
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {books.map((book) => (
            <div key={book.id} className="relative group/card">
              <BookCard book={book} variant="grid" />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete(book.book_id);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 text-white opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-red-600 cursor-pointer z-10"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {books.map((book) => (
            <div key={book.id} className="relative group/card">
              <BookCard book={book} variant="list" />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete(book.book_id);
                }}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-red-500/80 text-white opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-red-600 cursor-pointer z-10"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

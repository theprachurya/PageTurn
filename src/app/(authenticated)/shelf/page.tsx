"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, ArrowRight, Clock, Sparkles } from "lucide-react";
import { BookCard, type BookData, type BookTag, type BookShelf } from "@/components/books/book-card";
import { updateReadingStatus, type BookStatus } from "@/app/actions/library.actions";
import type { SupabaseClient } from "@supabase/supabase-js";

export default function ShelfPage() {
  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  if (!supabaseRef.current && typeof window !== "undefined") {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current!;

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch user_books
    const { data: ubData } = await supabase
      .from("user_books")
      .select(`
        id, book_id, status, current_cfi, progress_percentage, last_read_at,
        books (id, title, author, description, cover_url)
      `)
      .eq("user_id", user.id)
      .order("last_read_at", { ascending: false });

    // 2. Fetch tags mapping
    const { data: tagsData } = await supabase
      .from("book_tags")
      .select(`
        book_id,
        tags (id, name, color)
      `)
      .eq("user_id", user.id);

    // 3. Fetch shelves mapping
    const { data: shelvesData } = await supabase
      .from("shelf_books")
      .select(`
        book_id,
        shelves (id, name)
      `)
      .eq("user_id", user.id);

    if (ubData) {
      const mapped = ubData.map((ub: any) => {
        const book = ub.books;
        
        const bookTags = tagsData
          ?.filter(t => t.book_id === ub.book_id)
          .map(t => t.tags)
          .filter(Boolean) as unknown as BookTag[];

        const bookShelves = shelvesData
          ?.filter(s => s.book_id === ub.book_id)
          .map(s => s.shelves)
          .filter(Boolean) as unknown as BookShelf[];

        return {
          id: ub.id,
          book_id: ub.book_id,
          title: book?.title || "Unknown",
          author: book?.author || null,
          description: book?.description || null,
          cover_url: book?.cover_url || null,
          progress_percentage: Number(ub.progress_percentage) || 0,
          current_cfi: ub.current_cfi || null,
          last_read_at: ub.last_read_at || null,
          status: ub.status || "reading",
          tags: bookTags,
          shelves: bookShelves,
        };
      });
      setBooks(mapped);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (bookId: string, newStatus: BookStatus) => {
    try {
      await updateReadingStatus(bookId, newStatus);
      // Optimistic update
      setBooks(books.map(b => {
        if (b.book_id === bookId) {
          return {
            ...b, 
            status: newStatus,
            progress_percentage: newStatus === "completed" ? 100 : newStatus === "plan_to_read" ? 0 : b.progress_percentage
          };
        }
        return b;
      }));
    } catch (err) {
      console.error("Failed to update status", err);
      fetchBooks(); // revert on failure
    }
  };

  const handleDelete = async (bookId: string) => {
    if (!confirm("Are you sure you want to remove this book?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_books").delete().eq("book_id", bookId).eq("user_id", user.id);
    await supabase.from("books").delete().eq("id", bookId).eq("user_id", user.id);
    fetchBooks();
  };

  const latestBook = books[0];
  // Filter out the latest book from recent books, and maybe only show currently reading?
  const recentBooks = books.slice(1, 7);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-1">Your Shelf</h1>
        <p className="text-slate-500">Pick up where you left off</p>
      </div>

      {/* Continue Reading Hero */}
      {latestBook ? (
        <Link
          href={`/read/${latestBook.book_id}`}
          className="group block mb-10 rounded-3xl bg-gradient-to-br from-purple-600 via-purple-700 to-lavender-800 p-6 md:p-8 text-white shadow-xl shadow-purple-200/50 hover:shadow-purple-300/60 transition-all duration-500 hover:-translate-y-1"
        >
          <div className="flex items-center gap-2 text-purple-200 text-sm mb-4">
            <Clock className="w-4 h-4" />
            Continue Reading
          </div>
          <div className="flex gap-6 items-center">
            <div className="w-24 h-36 md:w-32 md:h-48 rounded-xl overflow-hidden bg-white/10 flex-shrink-0 shadow-lg relative">
              {latestBook.cover_url ? (
                <img
                  src={latestBook.cover_url}
                  alt={latestBook.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-white/40" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold mb-1 group-hover:text-purple-100 transition-colors">
                {latestBook.title}
              </h2>
              <p className="text-purple-200 mb-4">
                {latestBook.author || "Unknown Author"}
              </p>
              
              {latestBook.status !== "completed" && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 max-w-xs h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/80 rounded-full transition-all duration-500"
                      style={{
                        width: `${latestBook.progress_percentage}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-purple-200">
                    {Math.round(latestBook.progress_percentage)}%
                  </span>
                </div>
              )}
              
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-purple-200 group-hover:text-white transition-colors">
                Continue
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="mb-10 rounded-3xl bg-gradient-to-br from-purple-100 to-lavender-100 p-12 text-center">
          <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-purple-800 mb-2">
            Your shelf is empty
          </h2>
          <p className="text-purple-500 mb-6">
            Upload your first book to get started
          </p>
          <Link
            href="/library"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-lavender-600 text-white font-medium hover:scale-105 transition-transform"
          >
            Go to Library
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Recently Read */}
      {recentBooks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              Recently Read
            </h2>
            <Link
              href="/library"
              className="text-sm text-purple-500 hover:text-purple-600 font-medium flex items-center gap-1"
            >
              View All
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {recentBooks.map((book) => (
              <BookCard 
                key={book.id} 
                book={book} 
                variant="grid" 
                onDelete={handleDelete}
                onUpdateStatus={handleUpdateStatus}
                onManageTags={(id) => alert(`Manage tags for ${id} (Coming soon)`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

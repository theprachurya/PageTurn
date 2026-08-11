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

    const { data: ubData } = await supabase
      .from("user_books")
      .select(`
        id, book_id, status, current_cfi, progress_percentage, last_read_at,
        books (id, title, author, description, cover_url)
      `)
      .eq("user_id", user.id)
      .order("last_read_at", { ascending: false });

    const { data: tagsData } = await supabase
      .from("book_tags")
      .select(`
        book_id,
        tags (id, name, color)
      `)
      .eq("user_id", user.id);

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
      fetchBooks();
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
  const recentBooks = books.slice(1, 7);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 text-zinc-100">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-zinc-100 mb-1">Your Shelf</h1>
        <p className="text-zinc-400 text-sm">Pick up where you left off</p>
      </div>

      {/* Continue Reading Hero */}
      {latestBook ? (
        <Link
          href={`/read/${latestBook.book_id}`}
          className="group block mb-10 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-red-900/40 p-6 md:p-8 text-zinc-100 shadow-2xl shadow-red-950/30 hover:border-red-600/60 transition-all duration-500 hover:-translate-y-1 relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2 text-red-400 font-semibold text-xs uppercase tracking-wider mb-4">
            <Clock className="w-4 h-4 text-red-500" />
            Continue Reading
          </div>
          <div className="flex gap-6 items-center">
            <div className="w-24 h-36 md:w-32 md:h-48 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 flex-shrink-0 shadow-xl relative">
              {latestBook.cover_url ? (
                <img
                  src={latestBook.cover_url}
                  alt={latestBook.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-zinc-800" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-extrabold mb-1 group-hover:text-red-400 transition-colors">
                {latestBook.title}
              </h2>
              <p className="text-zinc-400 text-sm mb-4">
                {latestBook.author || "Unknown Author"}
              </p>
              
              {latestBook.status !== "completed" && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 max-w-xs h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${latestBook.progress_percentage}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-red-400 font-mono">
                    {Math.round(latestBook.progress_percentage)}%
                  </span>
                </div>
              )}
              
              <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-red-400 group-hover:text-red-300 transition-colors">
                Continue
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="mb-10 rounded-3xl bg-zinc-900/60 border border-zinc-800 p-12 text-center">
          <Sparkles className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-zinc-200 mb-2">
            Your shelf is empty
          </h2>
          <p className="text-zinc-400 text-sm mb-6">
            Upload your first book to get started
          </p>
          <Link
            href="/library"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold hover:scale-[1.02] transition-transform shadow-lg shadow-red-950/60"
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
            <h2 className="text-lg font-bold text-zinc-100">
              Recently Read
            </h2>
            <Link
              href="/library"
              className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 uppercase tracking-wider"
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
                onManageTags={() => {}}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


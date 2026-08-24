"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, ArrowRight, Clock, Sparkles } from "lucide-react";
import { BookCard, type BookData, type BookTag, type BookShelf } from "@/components/books/book-card";
import { updateReadingStatus, type BookStatus } from "@/app/actions/library.actions";
import { ManageCollectionsDialog } from "@/components/library/manage-collections-dialog";
import type { SupabaseClient } from "@supabase/supabase-js";

export default function ShelfPage() {
  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [managingCollectionsForBook, setManagingCollectionsForBook] = useState<{ id: string, title: string, tags: BookTag[], shelves: BookShelf[] } | null>(null);
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

    const [ubResult, tagsResult, shelvesResult] = await Promise.all([
      supabase
        .from("user_books")
        .select(`
          id, book_id, status, current_cfi, progress_percentage, last_read_at,
          books (id, title, author, description, cover_url)
        `)
        .eq("user_id", user.id)
        .order("last_read_at", { ascending: false }),
      supabase
        .from("book_tags")
        .select(`
          book_id,
          tags (id, name, color)
        `)
        .eq("user_id", user.id),
      supabase
        .from("shelf_books")
        .select(`
          book_id,
          shelves (id, name)
        `)
        .eq("user_id", user.id)
    ]);

    const ubData = ubResult.data;
    const tagsData = tagsResult.data;
    const shelvesData = shelvesResult.data;

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
    
    // Cascade deletes
    await supabase.from("reading_sessions").delete().eq("book_id", bookId).eq("user_id", user.id);
    await supabase.from("bookmarks").delete().eq("book_id", bookId).eq("user_id", user.id);
    await supabase.from("highlights").delete().eq("book_id", bookId).eq("user_id", user.id);
    await supabase.from("book_tags").delete().eq("book_id", bookId).eq("user_id", user.id);
    await supabase.from("shelf_books").delete().eq("book_id", bookId).eq("user_id", user.id);

    await supabase.from("user_books").delete().eq("book_id", bookId).eq("user_id", user.id);
    await supabase.from("books").delete().eq("id", bookId).eq("user_id", user.id);
    fetchBooks();
  };

  const latestBook = books[0];
  const recentBooks = books.slice(1, 11);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-7 h-7 border-2 border-zinc-800 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* =========================================================================
                                    MOBILE UI
      ========================================================================= */}
      <div className="md:hidden max-w-5xl mx-auto px-4 py-8 text-zinc-100">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-100 mb-1">Your Shelf</h1>
          <p className="text-zinc-500 text-sm">Pick up where you left off</p>
        </div>

        {latestBook ? (
          <Link
            href={`/read/${latestBook.book_id}`}
            className="group block mb-10 rounded-2xl bg-[#111113] border border-gold-500/15 p-5 text-zinc-100 shadow-xl hover:border-gold-500/30 transition-all duration-400 hover:-translate-y-0.5 relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 w-60 h-60 bg-gold-500/[0.04] rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-2 text-gold-500 font-semibold text-[11px] uppercase tracking-[0.12em] mb-4">
              <Clock className="w-3.5 h-3.5" />
              Continue Reading
            </div>
            <div className="flex gap-5 items-center">
              <div className="w-20 h-30 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800/60 flex-shrink-0 shadow-lg relative">
                {latestBook.cover_url ? (
                  <img
                    src={latestBook.cover_url}
                    alt={latestBook.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-zinc-800" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1 group-hover:text-gold-400 transition-colors">
                  {latestBook.title}
                </h2>
                <p className="text-zinc-500 text-sm mb-3">
                  {latestBook.author || "Unknown Author"}
                </p>
                
                {latestBook.status !== "completed" && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-xs h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-gold-500 to-gold-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${latestBook.progress_percentage}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gold-500 font-mono">
                      {Math.round(latestBook.progress_percentage)}%
                    </span>
                  </div>
                )}
                
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-gold-500 group-hover:text-gold-400 transition-colors">
                  Continue
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="mb-10 rounded-2xl bg-[#111113] border border-[#1f1f23] p-12 text-center">
            <Sparkles className="w-10 h-10 text-gold-500 mx-auto mb-4 opacity-60" />
            <h2 className="text-lg font-semibold text-zinc-200 mb-2">
              Your shelf is empty
            </h2>
            <p className="text-zinc-500 text-sm mb-6">
              Upload your first book to get started
            </p>
            <Link
              href="/library"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 text-zinc-950 font-semibold text-sm hover:bg-gold-400 transition-all"
            >
              Go to Library
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {recentBooks.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-zinc-200">
                Recently Read
              </h2>
              <Link
                href="/library"
                className="text-xs text-gold-500 hover:text-gold-400 font-medium flex items-center gap-1"
              >
                View All
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {recentBooks.slice(0, 4).map((book) => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  variant="grid" 
                  onDelete={handleDelete}
                  onUpdateStatus={handleUpdateStatus}
                  onManageTags={(id) => {
                    const b = books.find(x => x.book_id === id);
                    if (b) setManagingCollectionsForBook({ id: b.book_id, title: b.title, tags: b.tags || [], shelves: b.shelves || [] });
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
                                    DESKTOP UI
      ========================================================================= */}
      <div className="hidden md:block w-full">
        {latestBook ? (
          <section className="relative w-full h-[72vh] min-h-[580px] flex items-end pb-16 overflow-hidden">
            {/* Background Image (Heavily Blurred) */}
            <div 
              className="absolute inset-0 w-full h-full bg-cover bg-center blur-2xl scale-110 opacity-40 mix-blend-lighten"
              style={{ backgroundImage: `url('${latestBook.cover_url || ""}')` }}
            />
            {/* Cinematic Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-[#08080a]/70 to-[#08080a]/85" />
            
            <div className="relative z-10 w-full max-w-7xl mx-auto px-10 flex flex-col md:flex-row items-end justify-between gap-12">
              {/* Text Content */}
              <div className="max-w-3xl flex flex-col gap-3">
                <span className="text-[11px] text-gold-500 font-semibold uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" />
                  Now Reading
                </span>
                
                <h2 className="text-[4.5rem] leading-[1.08] font-bold text-white tracking-tight text-balance font-serif">
                  {latestBook.title}
                </h2>
                
                <p className="text-lg text-zinc-400 mt-1 line-clamp-2">
                  {latestBook.author || "Unknown Author"}
                </p>
                
                <div className="mt-6">
                  <Link
                    href={`/read/${latestBook.book_id}`} 
                    className="inline-flex bg-gold-500 hover:bg-gold-400 text-zinc-950 font-semibold text-base px-8 py-3.5 rounded-xl transition-colors items-center gap-3 shadow-[0_0_20px_rgba(212,168,83,0.2)]"
                  >
                    <BookOpen className="w-5 h-5" />
                    Continue Reading
                  </Link>
                </div>
              </div>
              
              {/* Book Cover Preview */}
              <div className="w-56 shrink-0 shadow-2xl shadow-black/60 border border-zinc-800/60 rounded-xl overflow-hidden relative group">
                <div className="aspect-[2/3] w-full relative bg-zinc-900">
                  {latestBook.cover_url ? (
                    <img
                      src={latestBook.cover_url}
                      alt={latestBook.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-zinc-800" />
                    </div>
                  )}
                </div>
                {/* Progress Bar pinned to bottom */}
                {latestBook.status !== "completed" && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-900/80">
                    <div 
                      className="h-full bg-gold-500 shadow-[0_0_8px_rgba(212,168,83,0.6)]" 
                      style={{ width: `${latestBook.progress_percentage}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="relative w-full h-[55vh] min-h-[450px] flex items-center justify-center pb-16">
            <div className="text-center max-w-lg">
              <Sparkles className="w-12 h-12 text-gold-500 mx-auto mb-6 opacity-60" />
              <h2 className="text-3xl font-bold text-white mb-4 font-serif">Your Library Awaits</h2>
              <p className="text-base text-zinc-500 mb-8">Upload your first book to begin your reading journey.</p>
              <Link
                href="/library"
                className="inline-flex items-center gap-3 px-7 py-3.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-zinc-950 font-semibold transition-all"
              >
                Go to Library
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        )}

        {/* Desktop Grid Section */}
        {recentBooks.length > 0 && (
          <section className="max-w-7xl mx-auto px-10 py-16">
            <div className="flex justify-between items-end mb-10">
              <h3 className="text-2xl font-bold text-zinc-100 tracking-tight">Recently Read</h3>
              <Link href="/library" className="text-sm font-medium text-gold-500 hover:text-gold-400 flex items-center gap-2">
                Browse Library <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-4 lg:grid-cols-5 gap-5">
              {recentBooks.map((book) => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  variant="grid" 
                  onDelete={handleDelete}
                  onUpdateStatus={handleUpdateStatus}
                  onManageTags={(id) => {
                    const b = books.find(x => x.book_id === id);
                    if (b) setManagingCollectionsForBook({ id: b.book_id, title: b.title, tags: b.tags || [], shelves: b.shelves || [] });
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {managingCollectionsForBook && (
        <ManageCollectionsDialog
          bookId={managingCollectionsForBook.id}
          bookTitle={managingCollectionsForBook.title}
          initialTags={managingCollectionsForBook.tags}
          initialShelves={managingCollectionsForBook.shelves}
          onClose={() => setManagingCollectionsForBook(null)}
          onUpdate={fetchBooks}
        />
      )}
    </div>
  );
}

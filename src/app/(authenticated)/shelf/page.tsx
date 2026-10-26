"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  ArrowRight,
  Clock,
  Sparkles,
  Bookmark,
  Layers,
  Flame,
  CheckCircle2,
  Compass,
} from "lucide-react";
import { BookCard, type BookData, type BookTag, type BookShelf } from "@/components/books/book-card";
import { updateReadingStatus, deleteBook, type BookStatus } from "@/app/actions/library.actions";
import { removeCachedEpub } from "@/lib/epub-cache";
import { ManageCollectionsDialog } from "@/components/library/manage-collections-dialog";
import { triggerUploadModal } from "@/lib/app-events";
import { toast } from "@/lib/toast";

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Not started";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 2) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ShelfPage() {
  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [managingCollectionsForBook, setManagingCollectionsForBook] = useState<{
    id: string;
    title: string;
    tags: BookTag[];
    shelves: BookShelf[];
  } | null>(null);

  const fetchBooks = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

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
        .eq("user_id", user.id),
    ]);

    const ubData = ubResult.data;
    const tagsData = tagsResult.data;
    const shelvesData = shelvesResult.data;

    if (ubData) {
      const tagsByBook = new Map<string, BookTag[]>();
      for (const row of tagsData || []) {
        const tag = row.tags as unknown as BookTag | null;
        if (!tag) continue;
        const list = tagsByBook.get(row.book_id);
        if (list) list.push(tag);
        else tagsByBook.set(row.book_id, [tag]);
      }

      const shelvesByBook = new Map<string, BookShelf[]>();
      for (const row of shelvesData || []) {
        const shelf = row.shelves as unknown as BookShelf | null;
        if (!shelf) continue;
        const list = shelvesByBook.get(row.book_id);
        if (list) list.push(shelf);
        else shelvesByBook.set(row.book_id, [shelf]);
      }

      const mapped = (
        ubData as unknown as Array<{
          id: string;
          book_id: string;
          progress_percentage: number | null;
          current_cfi: string | null;
          last_read_at: string | null;
          status: BookStatus | null;
          books: {
            title?: string | null;
            author?: string | null;
            description?: string | null;
            cover_url?: string | null;
          } | null;
        }>
      ).map((ub) => {
        const book = ub.books;

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
          tags: tagsByBook.get(ub.book_id) || [],
          shelves: shelvesByBook.get(ub.book_id) || [],
        };
      });
      setBooks(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!ignore) {
        await fetchBooks();
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [fetchBooks]);

  const handleUpdateStatus = async (bookId: string, newStatus: BookStatus) => {
    try {
      await updateReadingStatus(bookId, newStatus);
      setBooks((prev) =>
        prev.map((b) => {
          if (b.book_id === bookId) {
            return {
              ...b,
              status: newStatus,
              progress_percentage:
                newStatus === "completed"
                  ? 100
                  : newStatus === "plan_to_read"
                  ? 0
                  : b.progress_percentage,
            };
          }
          return b;
        })
      );
      toast.success(
        `Moved to ${
          newStatus === "completed"
            ? "Completed"
            : newStatus === "plan_to_read"
            ? "Want to Read"
            : "Currently Reading"
        }`
      );
    } catch (err) {
      console.error("Failed to update status", err);
      toast.error("Failed to update status");
      fetchBooks();
    }
  };

  const handleDelete = async (bookId: string) => {
    if (!confirm("Are you sure you want to remove this book from your library?")) return;
    try {
      await deleteBook(bookId);
      await removeCachedEpub(bookId);
      toast.success("Document removed");
      fetchBooks();
    } catch (err) {
      console.error("Failed to delete book", err);
      toast.error("Failed to delete document");
      fetchBooks();
    }
  };

  const latestBook = books[0];
  const recentBooks = books.slice(1, 11);

  // Stats for the telemetry bar
  const stats = useMemo(() => {
    const reading = books.filter((b) => b.status === "reading").length;
    const completed = books.filter((b) => b.status === "completed").length;
    const wantToRead = books.filter((b) => b.status === "plan_to_read").length;
    return { reading, completed, wantToRead, total: books.length };
  }, [books]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-fade-in">
        {/* Skeleton Continue Reading Hero */}
        <div className="p-8 md:p-12 rounded-2xl bg-[#1b241e]/50 border border-[#344137] flex flex-col md:flex-row gap-8 items-center animate-pulse">
          <div className="w-44 md:w-56 aspect-[2/3] rounded-xl bg-zinc-800/40" />
          <div className="flex-1 space-y-4 w-full">
            <div className="h-4 w-32 bg-zinc-800/40 rounded-full" />
            <div className="h-10 w-3/4 bg-zinc-800/40 rounded-lg" />
            <div className="h-4 w-1/3 bg-zinc-800/40 rounded-full" />
            <div className="h-2 w-full bg-zinc-800/40 rounded-full mt-6" />
            <div className="h-12 w-48 bg-zinc-800/40 rounded-xl mt-6" />
          </div>
        </div>

        {/* Skeleton Grid */}
        <div className="space-y-4">
          <div className="h-5 w-40 bg-zinc-800/40 rounded-full" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-zinc-800/30 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-12">
      {/* =========================================================================
                              HERO / CONTINUE READING
      ========================================================================= */}
      {latestBook ? (
        <section className="relative rounded-2xl md:rounded-3xl border border-[#344137] bg-gradient-to-br from-[#1b241e] via-[#17201b] to-[#121a15] p-6 sm:p-8 md:p-12 overflow-hidden shadow-2xl">
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d7f36a]/[0.035] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#121a15] rounded-full blur-2xl pointer-events-none" />

          {/* Technical Telemetry Ribbon Header */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-[#344137]/60 mb-8">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#d7f36a] animate-pulse" />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d7f36a]">
                01 // Continue Reading
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                {formatRelativeTime(latestBook.last_read_at)}
              </span>
              <span className="hidden sm:inline-block text-zinc-600">•</span>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-zinc-400">
                <Flame className="w-3.5 h-3.5 text-[#d7f36a]/80" />
                Active Instrument
              </span>
            </div>
          </div>

          {/* Main Hero Spread */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
            {/* 3D Tactile Physical Book Presentation */}
            <div className="md:col-span-4 lg:col-span-3 flex justify-center md:justify-start">
              <Link
                href={`/read/${latestBook.book_id}`}
                className="group relative block aspect-[2/3] w-48 sm:w-56 md:w-full max-w-[240px] rounded-xl overflow-hidden cursor-pointer transition-transform duration-500 ease-out hover:scale-[1.03] hover:-translate-y-1 shadow-[0_18px_38px_-12px_rgba(0,0,0,0.85)]"
                title={`Open "${latestBook.title}"`}
              >
                {/* Physical Book Spine Crease & Shadow Overlay */}
                <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/60 via-black/20 to-transparent z-20 pointer-events-none" />
                <div className="absolute inset-y-0 left-1 w-px bg-white/20 z-20 pointer-events-none" />

                {/* Bookmark Ribbon hanging over top edge */}
                <div className="absolute top-0 right-5 w-4 h-12 bg-[#d7f36a] shadow-md z-30 pointer-events-none transform transition-transform group-hover:translate-y-1">
                  <div className="absolute bottom-0 left-0 right-0 h-2 bg-[#17201b] clip-ribbon-tip" />
                </div>

                {/* Outer Paper Deckled Edge Highlight */}
                <div className="absolute inset-y-1 right-0 w-1.5 bg-gradient-to-l from-zinc-300/40 via-zinc-400/20 to-transparent z-20 pointer-events-none" />

                {/* Cover Image or Procedural Cover */}
                {latestBook.cover_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={latestBook.cover_url}
                    alt={latestBook.title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-[#202a23] to-[#17201b] flex flex-col justify-between p-5 border border-[#344137]">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      PageTurn Edition
                    </div>
                    <div>
                      <BookOpen className="w-8 h-8 text-[#d7f36a] mb-3 opacity-80" />
                      <p className="font-display font-bold text-sm text-zinc-100 line-clamp-3">
                        {latestBook.title}
                      </p>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400">
                      {latestBook.author || "Unknown"}
                    </div>
                  </div>
                )}
              </Link>
            </div>

            {/* Book Metadata & Reading Metrics */}
            <div className="md:col-span-8 lg:col-span-9 flex flex-col justify-center space-y-6">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight line-clamp-2">
                  {latestBook.title}
                </h1>
                <p className="text-sm sm:text-base text-zinc-400 font-medium mt-1.5">
                  {latestBook.author ? `by ${latestBook.author}` : "Author Unknown"}
                </p>
                {latestBook.description && (
                  <p className="text-xs sm:text-sm text-zinc-500 line-clamp-2 mt-3 leading-relaxed max-w-2xl">
                    {latestBook.description}
                  </p>
                )}
              </div>

              {/* Reading Progress Engine */}
              <div className="space-y-2.5 max-w-xl">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-[#d7f36a]" />
                    Reading Progress
                  </span>
                  <span className="font-bold text-[#d7f36a]">
                    {Math.round(latestBook.progress_percentage)}% Completed
                  </span>
                </div>

                <div className="h-2 w-full rounded-full bg-zinc-900/80 border border-[#344137]/60 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#d7f36a] to-[#bfdc51] shadow-[0_0_12px_rgba(215,243,106,0.35)] transition-all duration-500"
                    style={{ width: `${Math.max(2, Math.min(100, latestBook.progress_percentage))}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons & Quick Controls */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={`/read/${latestBook.book_id}`}
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#d7f36a] hover:bg-[#e7f4ad] text-[#17201b] font-display font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-[#d7f36a]/15 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-[#17201b]" />
                  Resume Reading
                  <ArrowRight className="w-4 h-4 text-[#17201b]" />
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    setManagingCollectionsForBook({
                      id: latestBook.book_id,
                      title: latestBook.title,
                      tags: latestBook.tags || [],
                      shelves: latestBook.shelves || [],
                    })
                  }
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-[#202a23] hover:bg-[#263229] border border-[#344137] hover:border-[#d7f36a]/30 text-xs font-mono text-zinc-300 transition-colors cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-zinc-400" />
                  Shelves & Tags ({(latestBook.shelves?.length || 0) + (latestBook.tags?.length || 0)})
                </button>

                {latestBook.status !== "completed" ? (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(latestBook.book_id, "completed")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-3 rounded-full bg-[#1b241e] hover:bg-[#202a23] border border-[#344137] text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    title="Mark as completed"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Finished
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#d7f36a]/10 border border-[#d7f36a]/20 text-[11px] font-mono text-[#d7f36a]">
                    Finished
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Purposeful Engineered Empty State */
        <section className="relative rounded-2xl md:rounded-3xl border border-[#344137] bg-[#1b241e]/60 p-10 md:p-16 text-center overflow-hidden">
          <div className="max-w-md mx-auto space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-[#202a23] border border-[#344137] flex items-center justify-center mx-auto text-[#d7f36a]">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-white tracking-tight">
                Your Reading Shelf is Ready
              </h2>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                Import any standard EPUB file to begin reading with typography controls, offline caching, and instant bookmark synchronization.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={triggerUploadModal}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#d7f36a] hover:bg-[#e7f4ad] text-[#17201b] font-display font-semibold text-xs tracking-wide transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
              >
                Upload EPUB Document
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <Link
                href="/library"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#202a23] hover:bg-[#263229] border border-[#344137] text-xs font-mono text-zinc-300 transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-zinc-400" />
                Browse Library
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
                          SHELF OVERVIEW & TELEMETRY STRIP
      ========================================================================= */}
      {books.length > 0 && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
          <div className="p-4 rounded-xl bg-[#1b241e] border border-[#344137] flex flex-col justify-between">
            <span className="font-mono text-[10px] uppercase text-zinc-500 tracking-wider">
              Total Books
            </span>
            <span className="font-display font-bold text-2xl text-zinc-100 mt-2">
              {stats.total}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-[#1b241e] border border-[#344137] flex flex-col justify-between">
            <span className="font-mono text-[10px] uppercase text-zinc-500 tracking-wider">
              In Progress
            </span>
            <span className="font-display font-bold text-2xl text-[#d7f36a] mt-2">
              {stats.reading}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-[#1b241e] border border-[#344137] flex flex-col justify-between">
            <span className="font-mono text-[10px] uppercase text-zinc-500 tracking-wider">
              Completed
            </span>
            <span className="font-display font-bold text-2xl text-emerald-400 mt-2">
              {stats.completed}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-[#1b241e] border border-[#344137] flex flex-col justify-between">
            <span className="font-mono text-[10px] uppercase text-zinc-500 tracking-wider">
              Want to Read
            </span>
            <span className="font-display font-bold text-2xl text-zinc-400 mt-2">
              {stats.wantToRead}
            </span>
          </div>
        </section>
      )}

      {/* =========================================================================
                              RECENTLY READ GRID
      ========================================================================= */}
      {recentBooks.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#344137]/60">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase font-semibold text-zinc-400 tracking-[0.14em]">
                02 // Recently Read
              </span>
              <span className="font-mono text-[11px] text-zinc-600">
                [{recentBooks.length}]
              </span>
            </div>

            <Link
              href="/library"
              className="group inline-flex items-center gap-1.5 text-xs font-mono text-[#d7f36a] hover:underline"
            >
              All Library Documents
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="library-book-grid">
            {recentBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                variant="grid"
                onDelete={handleDelete}
                onUpdateStatus={handleUpdateStatus}
                onManageTags={(id) => {
                  const b = books.find((x) => x.book_id === id);
                  if (b) {
                    setManagingCollectionsForBook({
                      id: b.book_id,
                      title: b.title,
                      tags: b.tags || [],
                      shelves: b.shelves || [],
                    });
                  }
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Collections Management Dialog */}
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

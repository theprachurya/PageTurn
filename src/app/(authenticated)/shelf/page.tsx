"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Layers3,
  NotebookPen,
  Plus,
  Sparkles,
} from "lucide-react";
import { type BookData, type BookTag, type BookShelf } from "@/components/books/book-card";
import { updateReadingStatus, type BookStatus } from "@/app/actions/library.actions";
import { ManageCollectionsDialog } from "@/components/library/manage-collections-dialog";
import { triggerUploadModal } from "@/lib/app-events";
import { toast } from "@/lib/toast";

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Not started";
  const diffMs = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMin < 2) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ShelfPage() {
  const router = useRouter();
  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState<{ id: string; title: string; tags: BookTag[]; shelves: BookShelf[] } | null>(null);

  const fetchBooks = useCallback(async (): Promise<BookData[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const [ubResult, tagsResult, shelvesResult] = await Promise.all([
      supabase.from("user_books").select("id, book_id, status, current_cfi, progress_percentage, last_read_at, books (id, title, author, description, cover_url)").eq("user_id", user.id).order("last_read_at", { ascending: false }),
      supabase.from("book_tags").select("book_id, tags (id, name, color)").eq("user_id", user.id),
      supabase.from("shelf_books").select("book_id, shelves (id, name)").eq("user_id", user.id),
    ]);
    if (ubResult.error) throw ubResult.error;

    const tagsByBook = new Map<string, BookTag[]>();
    for (const row of tagsResult.data || []) {
      const tag = row.tags as unknown as BookTag | null;
      if (tag) tagsByBook.set(row.book_id, [...(tagsByBook.get(row.book_id) || []), tag]);
    }
    const shelvesByBook = new Map<string, BookShelf[]>();
    for (const row of shelvesResult.data || []) {
      const shelf = row.shelves as unknown as BookShelf | null;
      if (shelf) shelvesByBook.set(row.book_id, [...(shelvesByBook.get(row.book_id) || []), shelf]);
    }

    const rows = (ubResult.data || []) as unknown as Array<{
      id: string;
      book_id: string;
      status: string | null;
      current_cfi: string | null;
      progress_percentage: number | string | null;
      last_read_at: string | null;
      books: { title?: string | null; author?: string | null; description?: string | null; cover_url?: string | null } | null;
    }>;
    return rows.map((row) => {
      const book = row.books;
      return {
        id: row.id,
        book_id: row.book_id,
        title: book?.title || "Untitled book",
        author: book?.author || null,
        description: book?.description || null,
        cover_url: book?.cover_url || null,
        progress_percentage: Number(row.progress_percentage) || 0,
        current_cfi: row.current_cfi || null,
        last_read_at: row.last_read_at || null,
        status: (row.status || "reading") as BookStatus,
        tags: tagsByBook.get(row.book_id) || [],
        shelves: shelvesByBook.get(row.book_id) || [],
      } satisfies BookData;
    });
  }, []);

  const refreshBooks = useCallback(async () => {
    try {
      setBooks(await fetchBooks());
    } catch (error) {
      console.error("Failed to load your reading desk", error);
      toast.error("Your books could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [fetchBooks]);

  useEffect(() => {
    let active = true;
    fetchBooks().then((result) => {
      if (active) setBooks(result);
    }).catch((error: unknown) => {
      console.error("Failed to load your reading desk", error);
      if (active) toast.error("Your books could not be loaded");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [fetchBooks]);

  const readingBooks = useMemo(() => books.filter((book) => book.status === "reading"), [books]);
  const activeBook = readingBooks.find((book) => book.last_read_at) || readingBooks[0] || null;
  const queue = useMemo(() => books.filter((book) => book.status === "plan_to_read").slice(0, 4), [books]);
  const otherReading = useMemo(() => readingBooks.filter((book) => book.book_id !== activeBook?.book_id), [readingBooks, activeBook]);
  const completedCount = useMemo(() => books.filter((book) => book.status === "completed").length, [books]);

  const moveToStatus = async (book: BookData, status: BookStatus): Promise<boolean> => {
    try {
      await updateReadingStatus(book.book_id, status);
      setBooks((current) => current.map((item) => item.book_id === book.book_id
        ? { ...item, status, progress_percentage: status === "completed" ? 100 : status === "plan_to_read" ? 0 : item.progress_percentage, current_cfi: status === "plan_to_read" ? null : item.current_cfi }
        : item));
      toast.success(status === "reading" ? "Added to your reading list" : status === "completed" ? "Marked as finished" : "Moved to your queue");
      return true;
    } catch (error) {
      console.error("Could not update reading status", error);
      toast.error("The book status could not be updated");
      return false;
    }
  };

  if (loading) {
    return <div className="today-page mx-auto max-w-6xl px-5 py-10 md:px-10">
      <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
      <div className="mt-4 h-10 w-64 max-w-full animate-pulse rounded bg-zinc-200" />
      <div className="mt-9 h-64 animate-pulse rounded-2xl bg-zinc-200" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="h-56 animate-pulse rounded-xl bg-zinc-200" /><div className="h-56 animate-pulse rounded-xl bg-zinc-200" /></div>
    </div>;
  }

  return (
    <div className="today-page mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-10">
      <header className="today-heading mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="today-eyebrow">Your reading desk</p>
          <h1 className="mt-2 text-[32px] font-semibold leading-tight sm:text-[38px]">A good place to pick up.</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-500">Your books, thoughts and reading rhythm—ready when you are.</p>
        </div>
        <button type="button" onClick={triggerUploadModal} className="today-import"><Plus className="h-4 w-4" /> Add a book</button>
      </header>

      {activeBook ? (
        <section className="today-resume overflow-hidden rounded-2xl border bg-white">
          <div className="today-resume-copy flex flex-col justify-center p-6 sm:p-9 lg:p-11">
            <div className="mb-7 flex items-center gap-2 text-xs font-medium text-[#496b55]"><BookOpen className="h-4 w-4" /> Pick up where you left off</div>
            <p className="mb-2 text-[11px] font-medium text-zinc-500">Last opened {formatRelativeTime(activeBook.last_read_at)}</p>
            <h2 className="max-w-xl text-2xl font-semibold leading-tight sm:text-3xl">{activeBook.title}</h2>
            <p className="mt-2 text-sm text-zinc-500">{activeBook.author || "Author not listed"}</p>
            {activeBook.description && <p className="mt-5 line-clamp-2 max-w-xl text-sm leading-6 text-zinc-500">{activeBook.description}</p>}
            <div className="mt-7 max-w-md">
              <div className="mb-2 flex items-center justify-between text-xs text-zinc-500"><span>Reading progress</span><span className="font-medium text-zinc-700">{Math.round(activeBook.progress_percentage)}%</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#eeede8]"><div className="h-full rounded-full bg-[#5b7961] transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(100, activeBook.progress_percentage))}%` }} /></div>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href={`/read/${activeBook.book_id}`} className="today-primary">Resume reading <ArrowRight className="h-4 w-4" /></Link>
              <button type="button" onClick={() => setManaging({ id: activeBook.book_id, title: activeBook.title, tags: activeBook.tags || [], shelves: activeBook.shelves || [] })} className="today-secondary"><Layers3 className="h-4 w-4" /> Organize</button>
              <button type="button" onClick={() => void moveToStatus(activeBook, "completed")} className="today-secondary"><Check className="h-4 w-4" /> Mark finished</button>
            </div>
          </div>
          <Link href={`/read/${activeBook.book_id}`} className="today-cover-panel" aria-label={`Resume ${activeBook.title}`}>
            {activeBook.cover_url ? (
              /* eslint-disable-next-line @next/next/no-img-element -- Cover URLs are user-scoped storage URLs and are not allowlisted for Next image optimization. */
              <img src={activeBook.cover_url} alt="" loading="eager" fetchPriority="high" decoding="async" />
            ) : <div className="today-cover-placeholder"><BookOpen className="h-8 w-8" /><span>{activeBook.title}</span><small>{activeBook.author || "PageTurn edition"}</small></div>}
            <span className="today-cover-progress" style={{ width: `${Math.max(3, Math.min(100, activeBook.progress_percentage))}%` }} />
          </Link>
        </section>
      ) : (
        <section className="today-empty rounded-2xl border bg-white px-6 py-12 text-center sm:px-12">
          <div className="today-empty-icon"><Sparkles className="h-5 w-5" /></div>
          <p className="today-eyebrow mt-5">A fresh page</p>
          <h2 className="mt-2 text-2xl font-semibold">Your next chapter starts here.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Import an EPUB to begin, or pick something from your reading queue.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={triggerUploadModal} className="today-primary"><Plus className="h-4 w-4" /> Add your first book</button>
            <Link href="/library" className="today-secondary">Explore your library <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      )}

      <section className="today-summary mt-5 grid grid-cols-3 divide-x rounded-xl border bg-white">
        <div><span>In progress</span><strong>{readingBooks.length}</strong></div>
        <div><span>In your queue</span><strong>{books.filter((book) => book.status === "plan_to_read").length}</strong></div>
        <div><span>Finished</span><strong>{completedCount}</strong></div>
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.12fr_.88fr]">
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><p className="today-eyebrow">When you’re ready</p><h2 className="mt-1 text-xl font-semibold">Up next</h2></div>
            <Link href="/library" className="today-text-link">View library <ChevronRight className="h-4 w-4" /></Link>
          </div>
          {queue.length ? <div className="today-queue divide-y rounded-xl border bg-white">
            {queue.map((book) => <article className="today-queue-item flex items-center gap-3 p-4 sm:gap-4" key={book.book_id}>
              <Link href={`/read/${book.book_id}`} className="today-queue-cover">
                {book.cover_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- Cover URLs are user-scoped storage URLs and are not allowlisted for Next image optimization. */
                  <img src={book.cover_url} alt="" loading="lazy" decoding="async" />
                ) : <BookOpen className="h-5 w-5" />}
              </Link>
              <div className="min-w-0 flex-1"><Link href={`/read/${book.book_id}`} className="block truncate text-sm font-medium text-zinc-800 hover:text-[#355c4a]">{book.title}</Link><p className="mt-1 truncate text-xs text-zinc-500">{book.author || "Author not listed"}</p></div>
              <button type="button" onClick={async () => { if (await moveToStatus(book, "reading")) router.push(`/read/${book.book_id}`); }} className="today-queue-action">Start reading <ArrowRight className="h-3.5 w-3.5" /></button>
            </article>)}
          </div> : <div className="today-queue-empty"><Clock3 className="h-4 w-4" /> Your reading queue is clear. Add a book from the library when something catches your eye.</div>}

          {otherReading.length > 0 && <div className="mt-10">
            <div className="mb-4 flex items-end justify-between"><div><p className="today-eyebrow">More in progress</p><h2 className="mt-1 text-xl font-semibold">Keep these close</h2></div><Link href="/library" className="today-text-link">All reading <ChevronRight className="h-4 w-4" /></Link></div>
            <div className="today-reading-list divide-y rounded-xl border bg-white">
              {otherReading.slice(0, 4).map((book) => <Link key={book.book_id} href={`/read/${book.book_id}`} className="today-reading-row flex items-center gap-3 p-4">
                <span className="today-queue-cover">{book.cover_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- Cover URLs are user-scoped storage URLs and are not allowlisted for Next image optimization. */
                  <img src={book.cover_url} alt="" loading="lazy" decoding="async" />
                ) : <BookOpen className="h-5 w-5" />}</span>
                <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium">{book.title}</strong><small className="mt-1 block text-xs text-zinc-500">{Math.round(book.progress_percentage)}% complete</small></span>
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              </Link>)}
            </div>
          </div>}
        </section>

        <aside className="today-side-column">
          <section className="today-notebook-card rounded-xl border p-5 sm:p-6">
            <div className="today-notebook-icon"><NotebookPen className="h-[18px] w-[18px]" /></div>
            <p className="today-eyebrow mt-5">Your notebook</p>
            <h2 className="mt-1 text-xl font-semibold">Ideas worth keeping.</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Highlights, marginal notes, and bookmarks from every book—together in one searchable place.</p>
            <Link href="/notebook" className="today-text-link mt-5">Open notebook <ArrowRight className="h-4 w-4" /></Link>
          </section>
          <Link href="/history" className="today-history-link mt-3 flex items-center justify-between rounded-xl border bg-white p-5">
            <span><span className="today-eyebrow">Your reading rhythm</span><strong className="mt-1 block text-sm font-medium">See your history and goals</strong></span>
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          </Link>
        </aside>
      </div>

      {managing && <ManageCollectionsDialog bookId={managing.id} bookTitle={managing.title} initialTags={managing.tags} initialShelves={managing.shelves} onClose={() => setManaging(null)} onUpdate={() => { void refreshBooks(); }} />}
    </div>
  );
}

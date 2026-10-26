"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  List,
  Filter,
  Library,
  Clock,
  Book,
  CheckCircle,
  Search,
  ArrowDownAZ,
  Tag,
  X,
  Sparkles,
} from "lucide-react";
import { BookCard, type BookData, type BookTag, type BookShelf } from "@/components/books/book-card";
import { ShelvesSidebar } from "@/components/library/shelves-sidebar";
import { ManageCollectionsDialog } from "@/components/library/manage-collections-dialog";
import { EditBookMetadataDialog } from "@/components/library/edit-book-metadata-dialog";
import { updateReadingStatus, deleteBook, type BookStatus } from "@/app/actions/library.actions";
import { removeCachedEpub } from "@/lib/epub-cache";
import { toast } from "@/lib/toast";

const BookUploader = dynamic(
  () => import("@/components/upload/book-uploader").then((module) => module.BookUploader),
  { ssr: false },
);

type FilterStatus = "all" | BookStatus;
type SortMode = "recent" | "title" | "progress";

type LibraryBookRow = {
  id: string;
  book_id: string;
  status: string | null;
  current_cfi: string | null;
  progress_percentage: number | string | null;
  last_read_at: string | null;
  books: {
    id: string;
    title: string | null;
    author: string | null;
    description: string | null;
    cover_url: string | null;
  } | null;
};

export default function LibraryPage() {
  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>("recent");
  const [activeShelfId, setActiveShelfId] = useState<string | null>(null);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [allUserTags, setAllUserTags] = useState<{ id: string; name: string }[]>([]);
  const [managingCollectionsForBook, setManagingCollectionsForBook] = useState<{
    id: string;
    title: string;
    tags: BookTag[];
    shelves: BookShelf[];
  } | null>(null);
  const [editingBook, setEditingBook] = useState<BookData | null>(null);

  const fetchLibraryData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [
      { data: ubData },
      { data: tagsData },
      { data: userTagsData },
      { data: shelvesData },
    ] = await Promise.all([
      supabase
        .from("user_books")
        .select(
          `id, book_id, status, current_cfi, progress_percentage, last_read_at, books (id, title, author, description, cover_url)`
        )
        .eq("user_id", user.id)
        .order("last_read_at", { ascending: false }),
      supabase.from("book_tags").select(`book_id, tags (id, name, color)`).eq("user_id", user.id),
      supabase.from("tags").select("id, name").eq("user_id", user.id).order("name"),
      supabase.from("shelf_books").select(`book_id, shelves (id, name)`).eq("user_id", user.id),
    ]);

    setAllUserTags(userTagsData || []);

    if (ubData) {
      const tagsByBook = new Map<string, BookTag[]>();
      for (const row of tagsData || []) {
        const tag = row.tags as unknown as BookTag | null;
        if (!tag) continue;
        const bookTags = tagsByBook.get(row.book_id);
        if (bookTags) bookTags.push(tag);
        else tagsByBook.set(row.book_id, [tag]);
      }

      const shelvesByBook = new Map<string, BookShelf[]>();
      for (const row of shelvesData || []) {
        const shelf = row.shelves as unknown as BookShelf | null;
        if (!shelf) continue;
        const bookShelves = shelvesByBook.get(row.book_id);
        if (bookShelves) bookShelves.push(shelf);
        else shelvesByBook.set(row.book_id, [shelf]);
      }

      setBooks(
        (ubData as unknown as LibraryBookRow[]).map((ub) => {
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
            status: (ub.status as BookStatus) || "reading",
            tags: tagsByBook.get(ub.book_id) || [],
            shelves: shelvesByBook.get(ub.book_id) || [],
          };
        })
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!ignore) await fetchLibraryData();
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [fetchLibraryData]);

  const handleDelete = async (bookId: string) => {
    if (!confirm("Are you sure you want to remove this book from your library?")) return;
    try {
      await deleteBook(bookId);
      await removeCachedEpub(bookId);
      toast.success("Document removed");
      fetchLibraryData();
    } catch (err) {
      console.error("Failed to delete book", err);
      toast.error("Failed to delete document");
      fetchLibraryData();
    }
  };

  const handleUpdateStatus = async (bookId: string, newStatus: BookStatus) => {
    try {
      await updateReadingStatus(bookId, newStatus);
      setBooks((current) =>
        current.map((b) =>
          b.book_id === bookId
            ? {
                ...b,
                status: newStatus,
                progress_percentage:
                  newStatus === "completed"
                    ? 100
                    : newStatus === "plan_to_read"
                    ? 0
                    : b.progress_percentage,
              }
            : b
        )
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
      fetchLibraryData();
    }
  };

  const handleMetadataSaved = (
    bookId: string,
    metadata: { title: string; author: string; description: string; cover_url: string }
  ) => {
    setBooks((current) =>
      current.map((book) =>
        book.book_id === bookId
          ? {
              ...book,
              ...metadata,
              author: metadata.author || null,
              description: metadata.description || null,
              cover_url: metadata.cover_url || null,
            }
          : book
      )
    );
    toast.success("Metadata updated");
  };

  const filteredBooks = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const recentAt = new Map(
      books.map((book) => [
        book.book_id,
        book.last_read_at ? new Date(book.last_read_at).getTime() : 0,
      ])
    );

    return books
      .filter((book) => {
        if (statusFilter !== "all" && book.status !== statusFilter) return false;
        if (activeShelfId && !book.shelves?.some((shelf) => shelf.id === activeShelfId))
          return false;
        if (activeTagId && !book.tags?.some((tag) => tag.id === activeTagId)) return false;
        if (
          query &&
          !book.title.toLowerCase().includes(query) &&
          !(book.author && book.author.toLowerCase().includes(query))
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        if (sortBy === "progress") return b.progress_percentage - a.progress_percentage;
        if (sortBy === "recent")
          return (recentAt.get(b.book_id) || 0) - (recentAt.get(a.book_id) || 0);
        return 0;
      });
  }, [books, statusFilter, activeShelfId, activeTagId, searchQuery, sortBy]);

  const bookCounts = useMemo(() => {
    const counts: Record<BookStatus, number> = { reading: 0, plan_to_read: 0, completed: 0 };
    for (const book of books) {
      if (book.status === "reading") counts.reading++;
      else if (book.status === "plan_to_read") counts.plan_to_read++;
      else if (book.status === "completed") counts.completed++;
    }
    return counts;
  }, [books]);

  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) +
    (activeShelfId ? 1 : 0) +
    (activeTagId ? 1 : 0) +
    (searchQuery ? 1 : 0);

  const resetAllFilters = () => {
    setStatusFilter("all");
    setActiveShelfId(null);
    setActiveTagId(null);
    setSearchQuery("");
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-60 flex-shrink-0 space-y-6">
          <div className="h-6 w-24 bg-zinc-800/40 rounded-full animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 w-full bg-zinc-800/30 rounded-lg animate-pulse" />
            ))}
          </div>
        </aside>
        <main className="flex-1 space-y-6">
          <div className="h-10 w-48 bg-zinc-800/40 rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-zinc-800/30 animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  const renderCard = (book: BookData) => (
    <BookCard
      key={book.id}
      book={book}
      variant={viewMode}
      onDelete={handleDelete}
      onUpdateStatus={handleUpdateStatus}
      onEditMetadata={(id) => {
        const selected = books.find((b) => b.book_id === id);
        if (selected) setEditingBook(selected);
      }}
      onManageTags={(id) => {
        const selected = books.find((b) => b.book_id === id);
        if (selected)
          setManagingCollectionsForBook({
            id: selected.book_id,
            title: selected.title,
            tags: selected.tags || [],
            shelves: selected.shelves || [],
          });
      }}
    />
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 flex flex-col md:flex-row gap-8 text-zinc-100">
      {/* =========================================================================
                                SIDEBAR NAVIGATION
      ========================================================================= */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <div className="sticky top-20 space-y-8">
          {/* Main Status Filters */}
          <div>
            <div className="flex items-center justify-between mb-3 px-3">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                01 // Views
              </p>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-[11px] font-mono text-[#d7f36a] hover:underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer",
                  statusFilter === "all"
                    ? "bg-[#d7f36a]/10 text-[#d7f36a] border border-[#d7f36a]/25 shadow-sm"
                    : "text-zinc-400 hover:bg-[#202a23] hover:text-zinc-200"
                )}
              >
                <Library className="w-4 h-4 shrink-0" />
                <span>All Documents</span>
                <span className="ml-auto text-[11px] opacity-60 font-mono">
                  [{books.length}]
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("reading")}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer",
                  statusFilter === "reading"
                    ? "bg-[#d7f36a]/10 text-[#d7f36a] border border-[#d7f36a]/25 shadow-sm"
                    : "text-zinc-400 hover:bg-[#202a23] hover:text-zinc-200"
                )}
              >
                <Book className="w-4 h-4 shrink-0" />
                <span>In Progress</span>
                <span className="ml-auto text-[11px] opacity-60 font-mono">
                  [{bookCounts.reading}]
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("plan_to_read")}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer",
                  statusFilter === "plan_to_read"
                    ? "bg-[#d7f36a]/10 text-[#d7f36a] border border-[#d7f36a]/25 shadow-sm"
                    : "text-zinc-400 hover:bg-[#202a23] hover:text-zinc-200"
                )}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>Want to Read</span>
                <span className="ml-auto text-[11px] opacity-60 font-mono">
                  [{bookCounts.plan_to_read}]
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("completed")}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer",
                  statusFilter === "completed"
                    ? "bg-[#d7f36a]/10 text-[#d7f36a] border border-[#d7f36a]/25 shadow-sm"
                    : "text-zinc-400 hover:bg-[#202a23] hover:text-zinc-200"
                )}
              >
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Finished</span>
                <span className="ml-auto text-[11px] opacity-60 font-mono">
                  [{bookCounts.completed}]
                </span>
              </button>
            </div>
          </div>

          {/* Tags Filter */}
          <div>
            <div className="flex items-center justify-between mb-3 px-3">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                02 // Tags
              </p>
              {activeTagId && (
                <button
                  type="button"
                  onClick={() => setActiveTagId(null)}
                  className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300"
                >
                  Clear
                </button>
              )}
            </div>

            {allUserTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 px-2">
                {allUserTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setActiveTagId(activeTagId === tag.id ? null : tag.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer",
                      activeTagId === tag.id
                        ? "bg-[#d7f36a] text-[#17201b] font-bold shadow-sm"
                        : "bg-[#1b241e] text-zinc-400 hover:text-zinc-200 border border-[#344137]"
                    )}
                  >
                    <Tag className="w-3 h-3" />
                    {tag.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-zinc-500 italic px-3">No tags created yet</p>
            )}
          </div>

          {/* Shelves Sidebar */}
          <div>
            <ShelvesSidebar activeShelfId={activeShelfId} onSelectShelf={setActiveShelfId} />
          </div>
        </div>
      </aside>

      {/* =========================================================================
                              MAIN CONTENT AREA
      ========================================================================= */}
      <main className="flex-1 min-w-0 md:pl-2 space-y-8">
        {/* Editorial Section Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#344137]/60">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[#d7f36a]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d7f36a]">
                Document Repository
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {activeShelfId
                ? "Shelf View"
                : statusFilter === "all"
                ? "Library Collection"
                : statusFilter === "reading"
                ? "Currently Reading"
                : statusFilter === "plan_to_read"
                ? "Want to Read"
                : "Finished Documents"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-mono mt-1">
              {filteredBooks.length} {filteredBooks.length === 1 ? "document" : "documents"} indexed in personal workspace
            </p>
          </div>

          <div className="shrink-0">
            <BookUploader onUploadComplete={fetchLibraryData} />
          </div>
        </header>

        {/* Toolbar Strip: Search, Sort, View Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input with Clear Button */}
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-[#d7f36a] transition-colors" />
            <input
              type="text"
              placeholder="Search by title, author, or keyword... (/)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#1b241e] border border-[#344137] focus:outline-none focus:border-[#d7f36a]/60 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 font-sans transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Sort Selector */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortMode)}
                className="appearance-none pl-3.5 pr-8 py-2.5 rounded-xl bg-[#1b241e] border border-[#344137] text-xs font-mono text-zinc-300 focus:outline-none focus:border-[#d7f36a]/60 cursor-pointer"
              >
                <option value="recent">Sort: Recently Opened</option>
                <option value="title">Sort: Title (A-Z)</option>
                <option value="progress">Sort: Progress (%)</option>
              </select>
              <ArrowDownAZ className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            </div>

            {/* Grid / List Switcher */}
            <div className="flex items-center bg-[#1b241e] border border-[#344137] rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  viewMode === "grid"
                    ? "bg-[#202a23] text-[#d7f36a] shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
                title="Grid view"
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  viewMode === "list"
                    ? "bg-[#202a23] text-[#d7f36a] shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
                title="List view"
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills / Active Search Indicator */}
        {(activeTagId || activeShelfId || statusFilter !== "all" || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="font-mono text-[11px] text-zinc-500 uppercase">Active Filters:</span>
            {statusFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#202a23] border border-[#344137] text-xs font-mono text-zinc-300">
                Status: {statusFilter}
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className="hover:text-red-400 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {activeTagId && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#d7f36a]/10 border border-[#d7f36a]/20 text-xs font-mono text-[#d7f36a]">
                Tag: {allUserTags.find((t) => t.id === activeTagId)?.name}
                <button
                  type="button"
                  onClick={() => setActiveTagId(null)}
                  className="hover:text-red-400 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#202a23] border border-[#344137] text-xs font-mono text-zinc-300">
                Query: &ldquo;{searchQuery}&rdquo;
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="hover:text-red-400 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* =========================================================================
                                DOCUMENT COLLECTION DISPLAY
        ========================================================================= */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-20 px-6 bg-[#1b241e]/50 rounded-2xl border border-[#344137] space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#202a23] border border-[#344137] flex items-center justify-center mx-auto text-zinc-500">
              {books.length === 0 ? <Sparkles className="w-6 h-6 text-[#d7f36a]" /> : <Filter className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-zinc-200">
                {books.length === 0 ? "No documents uploaded yet" : "No matching documents"}
              </h2>
              <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1">
                {books.length === 0
                  ? "Import an EPUB file to populate your personal library."
                  : "Try clearing your search query or removing active status and shelf filters."}
              </p>
            </div>
            {books.length > 0 && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#202a23] hover:bg-[#263229] border border-[#344137] text-xs font-mono text-[#d7f36a] transition-colors cursor-pointer"
              >
                Clear all active filters
              </button>
            )}
          </div>
        ) : (
          <div className={viewMode === "grid" ? "library-book-grid" : "space-y-3"}>
            {filteredBooks.map(renderCard)}
          </div>
        )}

        {/* Collections Dialog */}
        {managingCollectionsForBook && (
          <ManageCollectionsDialog
            bookId={managingCollectionsForBook.id}
            bookTitle={managingCollectionsForBook.title}
            initialTags={managingCollectionsForBook.tags}
            initialShelves={managingCollectionsForBook.shelves}
            onClose={() => setManagingCollectionsForBook(null)}
            onUpdate={fetchLibraryData}
          />
        )}

        {/* Metadata Editor Dialog */}
        {editingBook && (
          <EditBookMetadataDialog
            bookId={editingBook.book_id}
            initialMetadata={{
              title: editingBook.title,
              author: editingBook.author || "",
              description: editingBook.description || "",
              cover_url: editingBook.cover_url || "",
            }}
            onClose={() => setEditingBook(null)}
            onSaved={(metadata) => handleMetadataSaved(editingBook.book_id, metadata)}
          />
        )}
      </main>
    </div>
  );
}

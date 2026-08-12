"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { LayoutGrid, List, Filter, Tag as TagIcon, Library, Clock, Book, CheckCircle, Search, ArrowDownAZ } from "lucide-react";
import { BookCard, type BookData, type BookTag, type BookShelf } from "@/components/books/book-card";
import { BookUploader } from "@/components/upload/book-uploader";
import { ShelvesSidebar } from "@/components/library/shelves-sidebar";
import { ManageCollectionsDialog } from "@/components/library/manage-collections-dialog";
import { AIRecapDialog } from "@/components/library/ai-recap-dialog";
import { cn } from "@/lib/utils";
import { updateReadingStatus, type BookStatus } from "@/app/actions/library.actions";
import type { SupabaseClient } from "@supabase/supabase-js";

type FilterStatus = "all" | BookStatus;

export default function LibraryPage() {
  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Filtering & Sorting State
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "title" | "progress" | "added">("recent");
  const [activeShelfId, setActiveShelfId] = useState<string | null>(null);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [allUserTags, setAllUserTags] = useState<{id: string, name: string}[]>([]);
  
  // Dialog state
  const [managingCollectionsForBook, setManagingCollectionsForBook] = useState<{ id: string, title: string, tags: BookTag[], shelves: BookShelf[] } | null>(null);
  const [recapBook, setRecapBook] = useState<{ id: string, title: string, cfi?: string | null } | null>(null);

  const supabaseRef = useRef<SupabaseClient | null>(null);
  if (!supabaseRef.current && typeof window !== "undefined") {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current!;

  useEffect(() => {
    fetchLibraryData();
  }, []);

  const fetchLibraryData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
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

    const { data: userTagsData } = await supabase
      .from("tags")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name");
      
    if (userTagsData) setAllUserTags(userTagsData);

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

  const handleDelete = async (bookId: string) => {
    if (!confirm("Are you sure you want to remove this book?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("user_books").delete().eq("book_id", bookId).eq("user_id", user.id);
    await supabase.from("books").delete().eq("id", bookId).eq("user_id", user.id);
    fetchLibraryData();
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
      fetchLibraryData();
    }
  };

  let filteredBooks = books.filter(b => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (activeShelfId && !(b.shelves || []).some(s => s.id === activeShelfId)) return false;
    if (activeTagId && !(b.tags || []).some(t => t.id === activeTagId)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!b.title.toLowerCase().includes(q) && !(b.author && b.author.toLowerCase().includes(q))) {
        return false;
      }
    }
    return true;
  });

  filteredBooks = filteredBooks.sort((a, b) => {
    switch (sortBy) {
      case "title":
        return a.title.localeCompare(b.title);
      case "progress":
        return b.progress_percentage - a.progress_percentage;
      case "recent":
        const timeA = a.last_read_at ? new Date(a.last_read_at).getTime() : 0;
        const timeB = b.last_read_at ? new Date(b.last_read_at).getTime() : 0;
        return timeB - timeA;
      case "added":
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row gap-8 text-zinc-100">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <div className="sticky top-8 space-y-8">
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Library</h2>
            <div className="space-y-1">
              <button 
                onClick={() => setStatusFilter("all")}
                className={cn("w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer border", statusFilter === "all" ? "bg-red-950/40 text-red-400 border-red-900/50" : "text-zinc-400 border-transparent hover:bg-zinc-900 hover:text-zinc-200")}
              >
                <Library className="w-4 h-4" /> All Books
                <span className="ml-auto text-xs opacity-60 font-mono">{books.length}</span>
              </button>
              <button 
                onClick={() => setStatusFilter("reading")}
                className={cn("w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer border", statusFilter === "reading" ? "bg-red-950/40 text-red-400 border-red-900/50" : "text-zinc-400 border-transparent hover:bg-zinc-900 hover:text-zinc-200")}
              >
                <Book className="w-4 h-4" /> Reading
                <span className="ml-auto text-xs opacity-60 font-mono">{books.filter(b => b.status === "reading").length}</span>
              </button>
              <button 
                onClick={() => setStatusFilter("plan_to_read")}
                className={cn("w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer border", statusFilter === "plan_to_read" ? "bg-red-950/40 text-red-400 border-red-900/50" : "text-zinc-400 border-transparent hover:bg-zinc-900 hover:text-zinc-200")}
              >
                <Clock className="w-4 h-4" /> Want to Read
                <span className="ml-auto text-xs opacity-60 font-mono">{books.filter(b => b.status === "plan_to_read").length}</span>
              </button>
              <button 
                onClick={() => setStatusFilter("completed")}
                className={cn("w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer border", statusFilter === "completed" ? "bg-red-950/40 text-red-400 border-red-900/50" : "text-zinc-400 border-transparent hover:bg-zinc-900 hover:text-zinc-200")}
              >
                <CheckCircle className="w-4 h-4" /> Finished
                <span className="ml-auto text-xs opacity-60 font-mono">{books.filter(b => b.status === "completed").length}</span>
              </button>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-3 px-3">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tags</h2>
            </div>
            {allUserTags.length > 0 ? (
              <div className="flex flex-wrap gap-2 px-3">
                {allUserTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => setActiveTagId(activeTagId === tag.id ? null : tag.id)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer",
                      activeTagId === tag.id
                        ? "bg-red-950/60 border-red-800 text-red-300" 
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    )}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic px-3">No tags yet</p>
            )}
          </div>
          
          <ShelvesSidebar activeShelfId={activeShelfId} onSelectShelf={setActiveShelfId} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 md:pl-4">
        {/* Header */}
        <header className="mb-10">
          <h2 className="text-4xl md:text-5xl font-extrabold text-zinc-100 tracking-tight mb-2">
            {activeShelfId 
              ? "Shelf View" 
              : statusFilter === "all" ? "My Library" : statusFilter === "reading" ? "Currently Reading" : statusFilter === "plan_to_read" ? "Want to Read" : "Finished"}
          </h2>
          <p className="text-lg text-zinc-400">
            {statusFilter === "all" ? "Your personal collection. Pick up where you left off." : `${filteredBooks.length} ${filteredBooks.length === 1 ? "book" : "books"} found`}
          </p>
        </header>

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 lg:w-72 group focus-within:ring-1 focus-within:ring-red-500/50 rounded-xl transition-shadow">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-red-500" />
              <input 
                type="text" 
                placeholder="Search library..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-red-500 text-sm text-zinc-100 placeholder-zinc-500 transition-colors"
              />
            </div>
            
            {/* Sort */}
            <div className="relative">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none pl-3.5 pr-8 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-sm text-zinc-300 focus:outline-none focus:border-red-600 cursor-pointer shadow-inner"
              >
                <option value="recent">Recently Opened</option>
                <option value="title">Title</option>
                <option value="progress">Progress</option>
              </select>
              <ArrowDownAZ className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>

            {/* View Toggle */}
            <div className="hidden sm:flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded-lg transition-all cursor-pointer",
                  viewMode === "grid" ? "bg-zinc-800 text-red-400 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 rounded-lg transition-all cursor-pointer",
                  viewMode === "list" ? "bg-zinc-800 text-red-400 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <div className="shrink-0">
              <BookUploader onUploadComplete={fetchLibraryData} />
            </div>
          </div>
        </div>

        {/* Books Grid/List */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/50 rounded-3xl border border-zinc-800">
            <div className="w-20 h-20 rounded-3xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto mb-6">
              <Filter className="w-8 h-8 text-zinc-600" />
            </div>
            <h2 className="text-xl font-bold text-zinc-300 mb-2">No books found</h2>
            <p className="text-zinc-500 text-sm mb-6">You don't have any books matching this filter.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {filteredBooks.map((book) => (
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
                onAIRecap={(book) => setRecapBook({ id: book.book_id, title: book.title, cfi: book.current_cfi })}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBooks.map((book) => (
              <BookCard 
                key={book.id} 
                book={book} 
                variant="list" 
                onDelete={handleDelete}
                onUpdateStatus={handleUpdateStatus}
                onManageTags={(id) => {
                  const b = books.find(x => x.book_id === id);
                  if (b) setManagingCollectionsForBook({ id: b.book_id, title: b.title, tags: b.tags || [], shelves: b.shelves || [] });
                }}
                onAIRecap={(book) => setRecapBook({ id: book.book_id, title: book.title, cfi: book.current_cfi })}
              />
            ))}
          </div>
        )}
        
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
        
        {recapBook && (
          <AIRecapDialog
            bookId={recapBook.id}
            bookTitle={recapBook.title}
            currentCfi={recapBook.cfi}
            onClose={() => setRecapBook(null)}
          />
        )}
      </main>
    </div>
  );
}


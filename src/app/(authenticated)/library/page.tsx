"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { LayoutGrid, List, Filter, Tag as TagIcon, Library, Clock, Book, CheckCircle } from "lucide-react";
import { BookCard, type BookData, type BookTag, type BookShelf } from "@/components/books/book-card";
import { BookUploader } from "@/components/upload/book-uploader";
import { cn } from "@/lib/utils";
import { updateReadingStatus, type BookStatus } from "@/app/actions/library.actions";
import type { SupabaseClient } from "@supabase/supabase-js";

type FilterStatus = "all" | BookStatus;

export default function LibraryPage() {
  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  
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
        
        // Match tags
        const bookTags = tagsData
          ?.filter(t => t.book_id === ub.book_id)
          .map(t => t.tags)
          .filter(Boolean) as BookTag[];

        // Match shelves
        const bookShelves = shelvesData
          ?.filter(s => s.book_id === ub.book_id)
          .map(s => s.shelves)
          .filter(Boolean) as BookShelf[];

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
      fetchLibraryData(); // revert on failure
    }
  };

  const filteredBooks = books.filter(b => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <div className="sticky top-8 space-y-8">
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Library</h2>
            <div className="space-y-1">
              <button 
                onClick={() => setStatusFilter("all")}
                className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer", statusFilter === "all" ? "bg-purple-100 text-purple-700" : "text-slate-600 hover:bg-slate-100")}
              >
                <Library className="w-4 h-4" /> All Books
                <span className="ml-auto text-xs opacity-60">{books.length}</span>
              </button>
              <button 
                onClick={() => setStatusFilter("reading")}
                className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer", statusFilter === "reading" ? "bg-purple-100 text-purple-700" : "text-slate-600 hover:bg-slate-100")}
              >
                <Book className="w-4 h-4" /> Reading
                <span className="ml-auto text-xs opacity-60">{books.filter(b => b.status === "reading").length}</span>
              </button>
              <button 
                onClick={() => setStatusFilter("plan_to_read")}
                className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer", statusFilter === "plan_to_read" ? "bg-purple-100 text-purple-700" : "text-slate-600 hover:bg-slate-100")}
              >
                <Clock className="w-4 h-4" /> Want to Read
                <span className="ml-auto text-xs opacity-60">{books.filter(b => b.status === "plan_to_read").length}</span>
              </button>
              <button 
                onClick={() => setStatusFilter("completed")}
                className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer", statusFilter === "completed" ? "bg-purple-100 text-purple-700" : "text-slate-600 hover:bg-slate-100")}
              >
                <CheckCircle className="w-4 h-4" /> Finished
                <span className="ml-auto text-xs opacity-60">{books.filter(b => b.status === "completed").length}</span>
              </button>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tags</h2>
            </div>
            <p className="text-xs text-slate-500 italic px-3">Coming soon...</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-1">
              {statusFilter === "all" ? "All Books" : statusFilter === "reading" ? "Currently Reading" : statusFilter === "plan_to_read" ? "Want to Read" : "Finished"}
            </h1>
            <p className="text-slate-500">
              {filteredBooks.length} {filteredBooks.length === 1 ? "book" : "books"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="hidden sm:flex items-center bg-purple-50 rounded-xl p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded-lg transition-all cursor-pointer",
                  viewMode === "grid" ? "bg-white shadow-sm text-purple-600" : "text-slate-400 hover:text-purple-500"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 rounded-lg transition-all cursor-pointer",
                  viewMode === "list" ? "bg-white shadow-sm text-purple-600" : "text-slate-400 hover:text-purple-500"
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <BookUploader onUploadComplete={fetchLibraryData} />
          </div>
        </div>

        {/* Books Grid/List */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
            <div className="w-20 h-20 rounded-3xl bg-purple-50 flex items-center justify-center mx-auto mb-6">
              <Filter className="w-8 h-8 text-purple-300" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">No books found</h2>
            <p className="text-slate-400 mb-6">You don't have any books matching this filter.</p>
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
                onManageTags={(id) => alert(`Manage tags for ${id} (Coming soon)`)}
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
                onManageTags={(id) => alert(`Manage tags for ${id} (Coming soon)`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

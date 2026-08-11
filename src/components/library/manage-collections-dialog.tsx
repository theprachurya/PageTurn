"use client";

import { useState, useEffect } from "react";
import { X, Plus, Tag as TagIcon, Folder, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { 
  createTag, applyTagToBook, removeTagFromBook,
  createShelf, addBookToShelf, removeBookFromShelf
} from "@/app/actions/library.actions";
import { cn } from "@/lib/utils";
import type { BookTag, BookShelf } from "@/components/books/book-card";

interface Tag { id: string; name: string; color: string; }
interface Shelf { id: string; name: string; }

interface ManageCollectionsDialogProps {
  bookId: string;
  bookTitle: string;
  initialTags: BookTag[];
  initialShelves: BookShelf[];
  onClose: () => void;
  onUpdate: () => void;
}

export function ManageCollectionsDialog({ bookId, bookTitle, initialTags, initialShelves, onClose, onUpdate }: ManageCollectionsDialogProps) {
  const [activeTab, setActiveTab] = useState<"tags" | "shelves">("tags");
  
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [allShelves, setAllShelves] = useState<Shelf[]>([]);
  
  const [bookTags, setBookTags] = useState<Set<string>>(new Set(initialTags.map(t => t.id)));
  const [bookShelves, setBookShelves] = useState<Set<string>>(new Set(initialShelves.map(s => s.id)));
  
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [tagsRes, shelvesRes] = await Promise.all([
        supabase.from("tags").select("*").eq("user_id", user.id).order("name"),
        supabase.from("shelves").select("*").eq("user_id", user.id).order("name")
      ]);
      if (tagsRes.data) setAllTags(tagsRes.data);
      if (shelvesRes.data) setAllShelves(shelvesRes.data);
    }
    setLoading(false);
  };

  const handleToggleTag = async (tagId: string) => {
    setIsSubmitting(true);
    try {
      if (bookTags.has(tagId)) {
        await removeTagFromBook(bookId, tagId);
        const next = new Set(bookTags);
        next.delete(tagId);
        setBookTags(next);
      } else {
        await applyTagToBook(bookId, tagId);
        const next = new Set(bookTags);
        next.add(tagId);
        setBookTags(next);
      }
      onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleShelf = async (shelfId: string) => {
    setIsSubmitting(true);
    try {
      if (bookShelves.has(shelfId)) {
        await removeBookFromShelf(bookId, shelfId);
        const next = new Set(bookShelves);
        next.delete(shelfId);
        setBookShelves(next);
      } else {
        await addBookToShelf(bookId, shelfId);
        const next = new Set(bookShelves);
        next.add(shelfId);
        setBookShelves(next);
      }
      onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    
    setIsSubmitting(true);
    try {
      if (activeTab === "tags") {
        const newTag = await createTag(newItemName.trim(), "#dc2626");
        setAllTags(prev => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
        await applyTagToBook(bookId, newTag.id);
        setBookTags(prev => new Set(prev).add(newTag.id));
      } else {
        const newShelf = await createShelf(newItemName.trim());
        setAllShelves(prev => [...prev, newShelf].sort((a, b) => a.name.localeCompare(b.name)));
        await addBookToShelf(bookId, newShelf.id);
        setBookShelves(prev => new Set(prev).add(newShelf.id));
      }
      
      setNewItemName("");
      onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 text-zinc-100">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <h2 className="font-bold text-zinc-100">
            Organize Book
          </h2>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-4 pt-4 bg-zinc-950/40 border-b border-zinc-800">
          <p className="text-sm text-zinc-400 mb-4 truncate">
            Managing: <span className="font-semibold text-zinc-200">{bookTitle}</span>
          </p>
          
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab("tags")}
              className={cn("pb-2 text-sm font-medium border-b-2 transition-colors", activeTab === "tags" ? "border-red-500 text-red-400 font-semibold" : "border-transparent text-zinc-400 hover:text-zinc-200")}
            >
              <span className="flex items-center gap-1.5"><TagIcon className="w-3.5 h-3.5" /> Tags</span>
            </button>
            <button 
              onClick={() => setActiveTab("shelves")}
              className={cn("pb-2 text-sm font-medium border-b-2 transition-colors", activeTab === "shelves" ? "border-red-500 text-red-400 font-semibold" : "border-transparent text-zinc-400 hover:text-zinc-200")}
            >
              <span className="flex items-center gap-1.5"><Folder className="w-3.5 h-3.5" /> Shelves</span>
            </button>
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border-b border-zinc-800">
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              placeholder={`Create new ${activeTab === "tags" ? "tag" : "shelf"}...`}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:border-red-600 placeholder-zinc-500"
              disabled={isSubmitting}
            />
            <button 
              type="submit"
              disabled={isSubmitting || !newItemName.trim()}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="p-4 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-red-500" /></div>
          ) : activeTab === "tags" ? (
            allTags.length === 0 ? (
              <p className="text-center text-sm text-zinc-500 py-4 font-mono">No tags created yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const isActive = bookTags.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTag(tag.id)}
                      disabled={isSubmitting}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5",
                        isActive ? "bg-red-950/60 border-red-800 text-red-300 font-semibold" : "bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
                      )}
                    >
                      {isActive && <CheckIcon className="w-3 h-3 text-red-400" />}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            allShelves.length === 0 ? (
              <p className="text-center text-sm text-zinc-500 py-4 font-mono">No shelves created yet.</p>
            ) : (
              <div className="space-y-1.5">
                {allShelves.map((shelf) => {
                  const isActive = bookShelves.has(shelf.id);
                  return (
                    <button
                      key={shelf.id}
                      onClick={() => handleToggleShelf(shelf.id)}
                      disabled={isSubmitting}
                      className={cn(
                        "w-full px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer flex items-center gap-2",
                        isActive ? "bg-red-950/40 border-red-900/60 text-red-300 font-semibold" : "bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
                      )}
                    >
                      <Folder className={cn("w-4 h-4", isActive ? "fill-current text-red-500" : "text-zinc-500")} />
                      <span className="flex-1 text-left">{shelf.name}</span>
                      {isActive && <CheckIcon className="w-4 h-4 text-red-400" />}
                    </button>
                  );
                })}
              </div>
            )
          )}
        </div>
        
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-xl text-sm font-semibold hover:bg-zinc-700 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}


"use client";

import { useState, useEffect } from "react";
import { X, Plus, Tag as TagIcon, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTag, applyTagToBook, removeTagFromBook } from "@/app/actions/library.actions";
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ManageTagsDialogProps {
  bookId: string;
  bookTitle: string;
  initialTags: { id: string; name: string; color: string }[];
  onClose: () => void;
  onUpdate: () => void;
}

export function ManageTagsDialog({ bookId, bookTitle, initialTags, onClose, onUpdate }: ManageTagsDialogProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [bookTags, setBookTags] = useState<Set<string>>(new Set(initialTags.map(t => t.id)));
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUserTags();
  }, []);

  const fetchUserTags = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("tags").select("*").eq("user_id", user.id).order("name");
      if (data) setAllTags(data);
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

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    
    setIsSubmitting(true);
    try {
      const newTag = await createTag(newTagName.trim(), "#9333ea"); // Default purple
      setAllTags(prev => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
      
      await applyTagToBook(bookId, newTag.id);
      setBookTags(prev => new Set(prev).add(newTag.id));
      
      setNewTagName("");
      onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <TagIcon className="w-4 h-4 text-purple-500" />
            Manage Tags
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <p className="text-sm text-slate-500 mb-3 truncate">
            Adding tags to: <span className="font-medium text-slate-700">{bookTitle}</span>
          </p>
          <form onSubmit={handleCreateTag} className="flex gap-2">
            <input
              type="text"
              placeholder="Create new tag..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isSubmitting}
            />
            <button 
              type="submit"
              disabled={isSubmitting || !newTagName.trim()}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="p-4 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-purple-500" /></div>
          ) : allTags.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-4">No tags created yet.</p>
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
                      isActive 
                        ? "bg-purple-100 border-purple-200 text-purple-700" 
                        : "bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:text-purple-600"
                    )}
                  >
                    {isActive && <CheckIcon className="w-3 h-3" />}
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
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

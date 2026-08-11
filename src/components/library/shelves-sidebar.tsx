"use client";

import { useState, useEffect } from "react";
import { Folder, Plus, MoreVertical, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createShelf, deleteShelf } from "@/app/actions/library.actions";
import { cn } from "@/lib/utils";

interface Shelf {
  id: string;
  name: string;
  description: string | null;
}

interface ShelvesSidebarProps {
  activeShelfId: string | null;
  onSelectShelf: (id: string | null) => void;
}

export function ShelvesSidebar({ activeShelfId, onSelectShelf }: ShelvesSidebarProps) {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newShelfName, setNewShelfName] = useState("");

  useEffect(() => {
    fetchShelves();
  }, []);

  const fetchShelves = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("shelves").select("*").eq("user_id", user.id).order("created_at");
      if (data) setShelves(data);
    }
    setLoading(false);
  };

  const handleCreateShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShelfName.trim()) return;
    
    try {
      const newShelf = await createShelf(newShelfName.trim());
      setShelves(prev => [...prev, newShelf]);
      setNewShelfName("");
      setIsCreating(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteShelf = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the shelf "${name}"? Books inside will not be deleted.`)) return;
    
    try {
      await deleteShelf(id);
      setShelves(prev => prev.filter(s => s.id !== id));
      if (activeShelfId === id) {
        onSelectShelf(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3 px-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Shelves</h2>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="p-1 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1">
        {isCreating && (
          <form onSubmit={handleCreateShelf} className="px-3 py-2">
            <input
              autoFocus
              type="text"
              placeholder="Shelf name..."
              value={newShelfName}
              onChange={(e) => setNewShelfName(e.target.value)}
              className="w-full text-sm px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-red-600 font-medium"
              onBlur={() => {
                if (!newShelfName) setIsCreating(false);
              }}
            />
          </form>
        )}
        
        {loading ? (
          <div className="px-4 py-2 text-xs text-zinc-500 font-mono">Loading shelves...</div>
        ) : shelves.length === 0 && !isCreating ? (
          <div className="px-4 py-2 text-xs text-zinc-600 italic">No custom shelves.</div>
        ) : (
          shelves.map(shelf => (
            <div key={shelf.id} className="group relative">
              <button
                onClick={() => onSelectShelf(activeShelfId === shelf.id ? null : shelf.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left border",
                  activeShelfId === shelf.id 
                    ? "bg-red-950/40 text-red-400 border-red-900/50" 
                    : "text-zinc-400 border-transparent hover:bg-zinc-900 hover:text-zinc-200"
                )}
              >
                <Folder className={cn("w-4 h-4", activeShelfId === shelf.id ? "fill-current text-red-500" : "text-zinc-500")} />
                <span className="truncate pr-6">{shelf.name}</span>
              </button>
              
              <button
                onClick={() => handleDeleteShelf(shelf.id, shelf.name)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete shelf"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


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
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shelves</h2>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-purple-600 transition-colors cursor-pointer"
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
              className="w-full text-sm px-2 py-1.5 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              onBlur={() => {
                if (!newShelfName) setIsCreating(false);
              }}
            />
          </form>
        )}
        
        {loading ? (
          <div className="px-4 py-2 text-sm text-slate-400">Loading...</div>
        ) : shelves.length === 0 && !isCreating ? (
          <div className="px-4 py-2 text-xs text-slate-400 italic">No custom shelves.</div>
        ) : (
          shelves.map(shelf => (
            <div key={shelf.id} className="group relative">
              <button
                onClick={() => onSelectShelf(activeShelfId === shelf.id ? null : shelf.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left",
                  activeShelfId === shelf.id 
                    ? "bg-purple-100 text-purple-700" 
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Folder className={cn("w-4 h-4", activeShelfId === shelf.id ? "fill-current text-purple-400" : "text-slate-400")} />
                <span className="truncate pr-6">{shelf.name}</span>
              </button>
              
              <button
                onClick={() => handleDeleteShelf(shelf.id, shelf.name)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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

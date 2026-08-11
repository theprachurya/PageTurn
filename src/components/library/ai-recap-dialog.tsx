"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";

interface AIRecapDialogProps {
  bookId: string;
  bookTitle: string;
  currentCfi?: string | null;
  onClose: () => void;
}

export function AIRecapDialog({ bookId, bookTitle, currentCfi, onClose }: AIRecapDialogProps) {
  const [recap, setRecap] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecap() {
      try {
        const res = await fetch("/api/recap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId, bookTitle, currentCfi }),
        });
        
        if (!res.ok) throw new Error("Failed to fetch");
        
        const data = await res.json();
        setRecap(data.recap);
      } catch (err) {
        setError("Could not generate recap at this time.");
      } finally {
        setLoading(false);
      }
    }
    fetchRecap();
  }, [bookId, bookTitle, currentCfi]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 text-zinc-100">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-red-500" />
            <h2 className="font-bold text-zinc-100">
              AI Recap
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 min-h-[200px] flex flex-col items-center justify-center text-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 text-red-400">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              <p className="text-sm font-medium animate-pulse text-zinc-400">Generating your story recap...</p>
            </div>
          ) : error ? (
            <div className="text-red-400 text-sm">{error}</div>
          ) : (
            <div className="text-left w-full">
              <h3 className="text-lg font-extrabold text-zinc-100 mb-2">{bookTitle}</h3>
              <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                {recap}
              </p>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-red-950/60 transition-all cursor-pointer border border-red-500/30"
          >
            Ready to Read
          </button>
        </div>
      </div>
    </div>
  );
}


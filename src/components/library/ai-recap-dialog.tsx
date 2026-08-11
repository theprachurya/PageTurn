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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 border border-purple-100">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h2 className="font-semibold text-slate-800">
              AI Recap
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 min-h-[200px] flex flex-col items-center justify-center text-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 text-purple-600">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-medium animate-pulse">Generating your personalized recap...</p>
            </div>
          ) : error ? (
            <div className="text-red-500 text-sm">{error}</div>
          ) : (
            <div className="text-left w-full">
              <h3 className="text-lg font-bold text-slate-800 mb-2">{bookTitle}</h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                {recap}
              </p>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-lavender-600 text-white rounded-xl text-sm font-medium shadow-md shadow-purple-200 hover:scale-105 transition-all cursor-pointer"
          >
            Ready to Read
          </button>
        </div>
      </div>
    </div>
  );
}

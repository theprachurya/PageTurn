"use client";

import { useState } from "react";
import { Check, X, Palette, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export type HighlightColor = "yellow" | "green" | "blue" | "purple" | "red";

export const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  yellow: "#fef08a",
  green: "#bbf7d0",
  blue: "#bfdbfe",
  purple: "#e9d5ff",
  red: "#fecaca",
};

interface HighlightPopoverProps {
  x: number;
  y: number;
  initialColor?: HighlightColor;
  initialNote?: string;
  onSave: (color: HighlightColor, note?: string) => void;
  onClose: () => void;
  onDelete?: () => void;
  isExisting?: boolean;
}

export function HighlightPopover({
  x,
  y,
  initialColor = "yellow",
  initialNote = "",
  onSave,
  onClose,
  onDelete,
  isExisting = false,
}: HighlightPopoverProps) {
  const [color, setColor] = useState<HighlightColor>(initialColor);
  const [note, setNote] = useState(initialNote);
  const [isEditingNote, setIsEditingNote] = useState(!!initialNote);

  // Keep it within screen bounds
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${Math.max(10, Math.min(x, window.innerWidth - 300))}px`,
    top: `${Math.max(10, y)}px`,
    zIndex: 1000,
  };

  return (
    <div 
      style={style}
      className="w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                "w-6 h-6 rounded-full border-2 transition-transform",
                color === c ? "scale-110 border-slate-400 dark:border-slate-500" : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: HIGHLIGHT_COLORS[c] }}
              aria-label={`Select ${c} color`}
            />
          ))}
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <X className="w-4 h-4" />
        </button>
      </div>

      {isEditingNote ? (
        <div className="mb-2">
          <textarea
            autoFocus
            placeholder="Add a note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full h-20 p-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-slate-900 dark:text-slate-100"
          />
        </div>
      ) : (
        <button 
          onClick={() => setIsEditingNote(true)}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors mb-2"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Add Note</span>
        </button>
      )}

      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => onSave(color, note)}
          className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Check className="w-4 h-4" />
          {isExisting ? "Update" : "Save"}
        </button>
        {isExisting && onDelete && (
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { Palette, BookA, X } from "lucide-react";

interface HighlightActionBarProps {
  x: number;
  y: number;
  onHighlight: (color: string) => void;
  onDefine: () => void;
  onClose: () => void;
}

export const HIGHLIGHT_COLORS = [
  { id: "yellow", color: "#fef08a" },
  { id: "green", color: "#bbf7d0" },
  { id: "blue", color: "#bfdbfe" },
  { id: "purple", color: "#e9d5ff" },
  { id: "pink", color: "#fbcfe8" },
];

export function HighlightActionBar({ x, y, onHighlight, onDefine, onClose }: HighlightActionBarProps) {
  return (
    <div
      className="fixed z-40 bg-slate-900 text-white rounded-xl shadow-2xl flex items-center p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        top: Math.max(10, y - 50),
        left: Math.max(10, Math.min(window.innerWidth - 220, x - 100)),
      }}
    >
      <div className="flex items-center gap-1 pr-2 border-r border-slate-700">
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c.id}
            onClick={() => onHighlight(c.color)}
            className="w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-inner"
            style={{ backgroundColor: c.color }}
            title={`Highlight ${c.id}`}
          />
        ))}
      </div>
      
      <button
        onClick={onDefine}
        className="flex items-center gap-1 px-3 py-1 text-xs font-medium hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
      >
        <BookA className="w-4 h-4" />
        Define
      </button>

      <button
        onClick={onClose}
        className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

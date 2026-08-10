"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sun,
  Moon,
  Type,
  Plus,
  Minus,
  X,
  BookOpen,
  Menu,
  AlignJustify,
  FileText,
} from "lucide-react";
import type { ReaderSettings } from "@/lib/reader-settings";
import { cn } from "@/lib/utils";

export interface NavItem {
  id: string;
  href: string;
  label: string;
  subitems?: NavItem[];
}

interface ReaderToolbarProps {
  visible: boolean;
  settings: ReaderSettings;
  onSettingsChange: (settings: Partial<ReaderSettings>) => void;
  chapter: string;
  progress: number;
  toc: NavItem[];
  onNavigate: (href: string) => void;
  onClose: () => void;
}

export function ReaderToolbar({
  visible,
  settings,
  onSettingsChange,
  chapter,
  progress,
  toc,
  onNavigate,
  onClose,
}: ReaderToolbarProps) {
  const router = useRouter();
  const [showToc, setShowToc] = useState(false);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Top bar */}
      <div className="pointer-events-auto absolute top-0 left-0 right-0 bg-black/70 backdrop-blur-md text-white p-4 animate-fade-in">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/shelf")}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowToc(true)}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-center flex-1 mx-4">
            <p className="text-sm font-medium truncate">{chapter || "Reading"}</p>
            <p className="text-xs text-white/60">
              {Math.round(progress)}% complete
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* TOC Sidebar */}
      {showToc && (
        <div className="pointer-events-auto absolute inset-y-0 left-0 w-80 bg-black/90 backdrop-blur-xl text-white shadow-2xl animate-in slide-in-from-left z-50 flex flex-col">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-semibold text-lg">Table of Contents</h2>
            <button onClick={() => setShowToc(false)} className="p-2 hover:bg-white/10 rounded-full cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {toc.length > 0 ? (
              toc.map((item, idx) => (
                <button
                  key={item.id || idx}
                  onClick={() => {
                    onNavigate(item.href);
                    setShowToc(false);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium cursor-pointer"
                >
                  {item.label}
                </button>
              ))
            ) : (
              <p className="text-white/50 text-sm text-center mt-10">No chapters found</p>
            )}
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="pointer-events-auto absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-md text-white p-4 animate-fade-in">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Theme Row */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60 uppercase tracking-wider">
              Theme
            </span>
            <div className="flex gap-2">
              {[
                {
                  value: "light" as const,
                  label: "Light",
                  icon: Sun,
                  bg: "bg-white",
                  text: "text-slate-800",
                },
                {
                  value: "dark" as const,
                  label: "Dark",
                  icon: Moon,
                  bg: "bg-[#1a1a2e]",
                  text: "text-white",
                },
                {
                  value: "sepia" as const,
                  label: "Sepia",
                  icon: BookOpen,
                  bg: "bg-[#f4ecd8]",
                  text: "text-[#5b4636]",
                },
              ].map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => onSettingsChange({ theme: theme.value })}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                    settings.theme === theme.value
                      ? `${theme.bg} ${theme.text} shadow-lg`
                      : "bg-white/10 hover:bg-white/20"
                  )}
                >
                  <theme.icon className="w-3 h-3" />
                  {theme.label}
                </button>
              ))}
            </div>
          </div>

          {/* Layout Row */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60 uppercase tracking-wider">
              Layout
            </span>
            <div className="flex gap-2">
              {[
                { value: "paginated" as const, label: "Paginated", icon: FileText },
                { value: "scrolled" as const, label: "Scroll", icon: AlignJustify },
              ].map((layout) => (
                <button
                  key={layout.value}
                  onClick={() => onSettingsChange({ layout: layout.value })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                    settings.layout === layout.value
                      ? "bg-purple-500 text-white shadow-lg"
                      : "bg-white/10 hover:bg-white/20"
                  )}
                >
                  <layout.icon className="w-3 h-3 inline mr-1" />
                  {layout.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size Row */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60 uppercase tracking-wider">
              Font Size
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  onSettingsChange({
                    fontSize: Math.max(60, settings.fontSize - 10),
                  })
                }
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm w-12 text-center font-mono">
                {settings.fontSize}%
              </span>
              <button
                onClick={() =>
                  onSettingsChange({
                    fontSize: Math.min(200, settings.fontSize + 10),
                  })
                }
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Font Family Row */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60 uppercase tracking-wider">
              Font
            </span>
            <div className="flex gap-2">
              {[
                { value: "serif" as const, label: "Serif" },
                { value: "sans-serif" as const, label: "Sans" },
                { value: "dyslexic" as const, label: "Dyslexic" },
              ].map((font) => (
                <button
                  key={font.value}
                  onClick={() => onSettingsChange({ fontFamily: font.value })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                    settings.fontFamily === font.value
                      ? "bg-purple-500 text-white"
                      : "bg-white/10 hover:bg-white/20"
                  )}
                >
                  <Type className="w-3 h-3 inline mr-1" />
                  {font.label}
                </button>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

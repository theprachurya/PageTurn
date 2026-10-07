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
  Bookmark,
  Highlighter,
  Search,
  List,
  MessageSquare,
  Volume2,
  Square,
  Trash2,
} from "lucide-react";
import type { ReaderSettings } from "@/lib/reader-settings";
import { cn } from "@/lib/utils";

export interface NavItem {
  id: string;
  href: string;
  label: string;
  subitems?: NavItem[];
}

export interface BookmarkData {
  id: string;
  cfi: string;
  label: string;
  created_at: string;
}

export interface HighlightData {
  id: string;
  cfi_range: string;
  color: string;
  note: string | null;
  text?: string;
  created_at: string;
}

interface ReaderToolbarProps {
  visible: boolean;
  settings: ReaderSettings;
  onSettingsChange: (settings: Partial<ReaderSettings>) => void;
  chapter: string;
  progress: number;
  chapterProgress?: number;
  toc: NavItem[];
  bookmarks?: BookmarkData[];
  highlights?: HighlightData[];
  estimatedTimeRemaining?: number | null;
  isBookmarked: boolean;
  onNavigate: (cfi: string) => void;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  onToggleBookmark: () => void;
  onDeleteBookmark: (bookmarkId: string) => void;
  onToggleTTS: () => void;
  isReadingAloud: boolean;
  onSearch?: (query: string) => void;
  searchResults?: { cfi: string; excerpt: string }[];
  isSearching?: boolean;
  onClose: () => void;
}

export function ReaderToolbar({
  visible,
  settings,
  onSettingsChange,
  chapter,
  progress,
  chapterProgress = 0,
  toc,
  bookmarks = [],
  highlights = [],
  estimatedTimeRemaining,
  isBookmarked,
  onNavigate,
  onNextChapter,
  onPrevChapter,
  onToggleBookmark,
  onDeleteBookmark,
  onToggleTTS,
  isReadingAloud,
  onSearch,
  searchResults = [],
  isSearching = false,
  onClose,
}: ReaderToolbarProps) {
  const router = useRouter();
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeTab, setActiveTab] = useState<"toc" | "bookmarks" | "highlights" | "search">("toc");
  const [searchQuery, setSearchQuery] = useState("");

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none text-zinc-100 font-sans">
      {/* Top bar */}
      <div className="pointer-events-auto absolute top-0 left-0 right-0 bg-[#08080a]/92 backdrop-blur-2xl text-zinc-100 p-4 border-b border-zinc-800/40 animate-fade-in shadow-2xl">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/shelf")}
              className="p-2 rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setShowSidebar(!showSidebar);
                if (!showSidebar) setActiveTab("toc");
              }}
              className="p-2 rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-center flex-1 mx-4">
            <p className="text-sm font-medium truncate text-zinc-200">{chapter || "Reading"}</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              {onPrevChapter && (
                <button onClick={onPrevChapter} className="text-zinc-500 hover:text-white p-1 rounded transition-colors cursor-pointer" title="Previous Chapter">
                  <ArrowLeft className="w-3 h-3" />
                </button>
              )}
              <div className="flex flex-col items-center">
                <p className="text-xs text-zinc-500 font-mono">
                  {Math.round(progress)}% book
                </p>
                {chapterProgress > 0 && (
                  <p className="text-[10px] text-zinc-600 font-mono">
                    {Math.round(chapterProgress)}% chapter
                  </p>
                )}
              </div>
              {onNextChapter && (
                <button onClick={onNextChapter} className="text-zinc-500 hover:text-white p-1 rounded transition-colors cursor-pointer" title="Next Chapter">
                  <ArrowLeft className="w-3 h-3 rotate-180" />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleBookmark}
              className="p-2 rounded-lg hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              <Bookmark className={cn("w-5 h-5", isBookmarked ? "fill-current text-gold-500" : "text-zinc-500")} />
            </button>
            <button
              onClick={onToggleTTS}
              className="p-2 rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={isReadingAloud ? "Stop Reading Aloud" : "Read Aloud"}
            >
              {isReadingAloud ? <Square className="w-5 h-5 text-gold-500" /> : <Volume2 className="w-5 h-5 text-zinc-500" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="pointer-events-auto absolute inset-y-0 left-0 w-80 bg-[#0c0c0e]/97 backdrop-blur-2xl border-r border-zinc-800/40 text-zinc-100 shadow-2xl animate-in slide-in-from-left z-50 flex flex-col">
          <div className="p-4 border-b border-zinc-800/40 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base text-zinc-100">Navigation</h2>
              <button onClick={() => setShowSidebar(false)} className="p-1.5 hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-200 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Tabs */}
            <div className="flex bg-[#111113] border border-[#1f1f23] p-0.5 rounded-lg">
              {[
                { id: "toc" as const, icon: List, title: "TOC" },
                { id: "bookmarks" as const, icon: Bookmark, title: "Bookmarks" },
                { id: "highlights" as const, icon: Highlighter, title: "Highlights" },
                { id: "search" as const, icon: Search, title: "Search" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    "flex-1 p-2 flex justify-center items-center rounded-md transition-colors cursor-pointer",
                    activeTab === t.id ? "bg-gold-500 text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-200"
                  )}
                  title={t.title}
                >
                  <t.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
            {activeTab === "toc" && (
              toc.length > 0 ? (
                toc.map((item, idx) => (
                  <button
                    key={item.id || idx}
                    onClick={() => {
                      onNavigate(item.href);
                      setShowSidebar(false);
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-zinc-800/40 transition-colors text-sm font-medium text-zinc-400 hover:text-zinc-100 cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))
              ) : (
                <p className="text-zinc-600 text-sm text-center mt-10">No chapters found</p>
              )
            )}

            {activeTab === "bookmarks" && (
              bookmarks.length > 0 ? (
                bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="group flex items-center gap-1 rounded-lg bg-zinc-900/40 border border-zinc-800/60 border-l-2 border-l-gold-500 pr-1 transition-colors hover:bg-zinc-800/50"
                  >
                    <button
                      onClick={() => {
                        onNavigate(bm.cfi);
                        setShowSidebar(false);
                        onClose();
                      }}
                      className="min-w-0 flex-1 text-left p-3 text-sm cursor-pointer"
                      aria-label={`Go to bookmark ${bm.label || "Bookmark"}`}
                    >
                      <p className="font-medium text-zinc-200 truncate">{bm.label || "Bookmark"}</p>
                      <p className="text-xs text-zinc-600 font-mono mt-1">{new Date(bm.created_at).toLocaleDateString()}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteBookmark(bm.id)}
                      className="shrink-0 p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 transition-colors cursor-pointer"
                      aria-label={`Delete bookmark ${bm.label || "Bookmark"}`}
                      title="Delete bookmark"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-zinc-600 text-sm text-center mt-10">No bookmarks yet</p>
              )
            )}

            {activeTab === "highlights" && (
              highlights.length > 0 ? (
                highlights.map((hl) => (
                  <button
                    key={hl.id}
                    onClick={() => {
                      onNavigate(hl.cfi_range);
                      setShowSidebar(false);
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-lg bg-zinc-900/40 hover:bg-zinc-800/50 border border-zinc-800/60 transition-colors text-sm cursor-pointer flex flex-col gap-1.5"
                    style={{ borderLeft: `3px solid ${hl.color || '#d4a853'}` }}
                  >
                    {hl.text && <p className="italic text-zinc-300 text-xs line-clamp-2">&quot;{hl.text}&quot;</p>}
                    {hl.note && (
                      <div className="flex items-start gap-1.5 mt-1.5 bg-zinc-950/60 p-2 rounded-md border border-zinc-800/40">
                        <MessageSquare className="w-3 h-3 text-gold-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-zinc-300">{hl.note}</p>
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-600 font-mono mt-1">{new Date(hl.created_at).toLocaleDateString()}</p>
                  </button>
                ))
              ) : (
                <p className="text-zinc-600 text-sm text-center mt-10">No highlights yet</p>
              )
            )}

            {activeTab === "search" && (
              <div className="space-y-4">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (onSearch && searchQuery.trim()) onSearch(searchQuery);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Search in book..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-[#111113] border border-[#1f1f23] rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-gold-500/40"
                  />
                  <button type="submit" className="bg-gold-500 p-2.5 rounded-lg cursor-pointer hover:bg-gold-400 transition-colors shadow-sm text-zinc-950">
                    <Search className="w-4 h-4" />
                  </button>
                </form>
                
                <div className="space-y-1.5 mt-4">
                  {isSearching ? (
                    <p className="text-zinc-600 text-sm text-center mt-10">Searching...</p>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((res, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          onNavigate(res.cfi);
                          setShowSidebar(false);
                          onClose();
                        }}
                        className="w-full text-left p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60 hover:bg-zinc-800/40 transition-colors text-sm cursor-pointer"
                      >
                        <p className="text-zinc-300 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: res.excerpt }} />
                      </button>
                    ))
                  ) : searchQuery ? (
                    <p className="text-zinc-600 text-sm text-center mt-10">No results found</p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="pointer-events-auto absolute bottom-0 left-0 right-0 bg-[#08080a]/92 backdrop-blur-2xl border-t border-zinc-800/40 text-zinc-100 p-4 animate-fade-in shadow-2xl">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Theme Row */}
          <div className="flex items-center justify-between">
            <span className="section-label">
              Theme
            </span>
            <div className="flex gap-2">
              {[
                {
                  value: "light" as const,
                  label: "Light",
                  icon: Sun,
                  bg: "bg-white",
                  text: "text-slate-900 font-semibold",
                },
                {
                  value: "dark" as const,
                  label: "Dark",
                  icon: Moon,
                  bg: "bg-zinc-900 border border-zinc-700",
                  text: "text-white font-semibold",
                },
                {
                  value: "sepia" as const,
                  label: "Sepia",
                  icon: BookOpen,
                  bg: "bg-[#f4ecd8]",
                  text: "text-[#5b4636] font-semibold",
                },
              ].map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => onSettingsChange({ theme: theme.value })}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border",
                    settings.theme === theme.value
                      ? `${theme.bg} ${theme.text} shadow-sm border-gold-500/30`
                      : "bg-[#111113] border-[#1f1f23] text-zinc-500 hover:text-zinc-200"
                  )}
                >
                  <theme.icon className="w-3 h-3" />
                  {theme.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size Row */}
          <div className="flex items-center justify-between">
            <span className="section-label">
              Font Size
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  onSettingsChange({
                    fontSize: Math.max(60, settings.fontSize - 10),
                  })
                }
                className="p-2 rounded-lg bg-[#111113] border border-[#1f1f23] hover:bg-zinc-800/60 text-zinc-400 transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm w-12 text-center font-mono font-semibold text-gold-500">
                {settings.fontSize}%
              </span>
              <button
                onClick={() =>
                  onSettingsChange({
                    fontSize: Math.min(200, settings.fontSize + 10),
                  })
                }
                className="p-2 rounded-lg bg-[#111113] border border-[#1f1f23] hover:bg-zinc-800/60 text-zinc-400 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Font Family Row */}
          <div className="flex items-center justify-between">
            <span className="section-label">
              Typography
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
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border",
                    settings.fontFamily === font.value
                      ? "bg-gold-500 border-gold-400 text-zinc-950 font-semibold shadow-sm"
                      : "bg-[#111113] border-[#1f1f23] text-zinc-500 hover:text-zinc-200"
                  )}
                >
                  <Type className="w-3 h-3 inline mr-1" />
                  {font.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Custom CSS Toggle */}
          <div className="flex items-center justify-between">
            <span className="section-label">
              Disable Publisher CSS
            </span>
            <button
              onClick={() => onSettingsChange({ disablePublisherCSS: !settings.disablePublisherCSS })}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border",
                settings.disablePublisherCSS
                  ? "bg-gold-500 border-gold-400 text-zinc-950 font-semibold shadow-sm"
                  : "bg-[#111113] border-[#1f1f23] text-zinc-500 hover:text-zinc-200"
              )}
            >
              {settings.disablePublisherCSS ? "On" : "Off"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

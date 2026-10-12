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
  Bookmark,
  Highlighter,
  Search,
  List,
  MessageSquare,
  Volume2,
  Square,
  Trash2,
  Maximize2,
  Minimize2,
  Sliders,
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
  note?: string | null;
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
  distractionFree?: boolean;
  onToggleDistractionFree?: () => void;
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
  distractionFree = false,
  onToggleDistractionFree,
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
  const [showTypographyDrawer, setShowTypographyDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState<"toc" | "bookmarks" | "highlights" | "search">("toc");
  const [searchQuery, setSearchQuery] = useState("");

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none text-zinc-100 font-sans">
      {/* =========================================================================
                                TOP FLOATING BAR
      ========================================================================= */}
      <header className="pointer-events-auto absolute top-0 left-0 right-0 bg-[#17201b]/95 backdrop-blur-xl text-zinc-100 px-4 py-3 sm:px-6 border-b border-[#344137] animate-fade-in shadow-2xl">
        <div className="flex items-center justify-between max-w-5xl mx-auto gap-3">
          {/* Left Controls: Back & Table of Contents */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push("/shelf")}
              className="p-2 rounded-xl hover:bg-[#202a23] text-zinc-400 hover:text-[#d7f36a] transition-all cursor-pointer"
              title="Return to Shelf"
              aria-label="Return to Shelf"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSidebar(!showSidebar);
                if (!showSidebar) setActiveTab("toc");
              }}
              className={cn(
                "p-2 rounded-xl transition-all cursor-pointer",
                showSidebar
                  ? "bg-[#d7f36a] text-[#17201b]"
                  : "hover:bg-[#202a23] text-zinc-400 hover:text-white"
              )}
              title="Table of Contents & Bookmarks"
              aria-label="Table of Contents"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          {/* Center Instrument Telemetry: Chapter & Position */}
          <div className="flex-1 mx-2 sm:mx-4 text-center min-w-0">
            <p className="font-display font-medium text-xs sm:text-sm text-zinc-200 truncate">
              {chapter || "Chapter"}
            </p>
            <div className="flex items-center justify-center gap-2 mt-0.5">
              {onPrevChapter && (
                <button
                  type="button"
                  onClick={onPrevChapter}
                  className="text-zinc-500 hover:text-[#d7f36a] p-0.5 rounded transition-colors cursor-pointer"
                  title="Previous Chapter"
                  aria-label="Previous Chapter"
                >
                  <ArrowLeft className="w-3 h-3" />
                </button>
              )}
              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                <span className="font-bold text-[#d7f36a]">{Math.round(progress)}%</span>
                {estimatedTimeRemaining !== undefined &&
                  estimatedTimeRemaining !== null &&
                  estimatedTimeRemaining > 0 && (
                    <span className="text-zinc-500 hidden sm:inline">
                      • ~{estimatedTimeRemaining}m left
                    </span>
                  )}
                {chapterProgress > 0 && (
                  <span className="text-zinc-500 hidden md:inline">
                    • {Math.round(chapterProgress)}% section
                  </span>
                )}
              </div>
              {onNextChapter && (
                <button
                  type="button"
                  onClick={onNextChapter}
                  className="text-zinc-500 hover:text-[#d7f36a] p-0.5 rounded transition-colors cursor-pointer"
                  title="Next Chapter"
                  aria-label="Next Chapter"
                >
                  <ArrowLeft className="w-3 h-3 rotate-180" />
                </button>
              )}
            </div>
          </div>

          {/* Right Controls: Bookmark, Zen Mode, Typography Drawer, Close */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Bookmark Trigger */}
            <button
              type="button"
              onClick={onToggleBookmark}
              className={cn(
                "p-2 rounded-xl transition-all cursor-pointer",
                isBookmarked
                  ? "bg-[#d7f36a]/15 text-[#d7f36a]"
                  : "hover:bg-[#202a23] text-zinc-400 hover:text-white"
              )}
              title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
              aria-label="Bookmark this position"
            >
              <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-current")} />
            </button>

            {/* Read Aloud / TTS */}
            <button
              type="button"
              onClick={onToggleTTS}
              className={cn(
                "p-2 rounded-xl transition-all cursor-pointer",
                isReadingAloud
                  ? "bg-[#d7f36a] text-[#17201b]"
                  : "hover:bg-[#202a23] text-zinc-400 hover:text-white"
              )}
              title={isReadingAloud ? "Stop Read Aloud" : "Read Aloud (TTS)"}
              aria-label="Read aloud"
            >
              {isReadingAloud ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Typography Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowTypographyDrawer(!showTypographyDrawer)}
              className={cn(
                "p-2 rounded-xl transition-all cursor-pointer",
                showTypographyDrawer
                  ? "bg-[#202a23] text-[#d7f36a] border border-[#344137]"
                  : "hover:bg-[#202a23] text-zinc-400 hover:text-white"
              )}
              title="Typography & Appearance"
              aria-label="Typography settings"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Distraction Free / Zen Mode Toggle */}
            {onToggleDistractionFree && (
              <button
                type="button"
                onClick={onToggleDistractionFree}
                className={cn(
                  "p-2 rounded-xl transition-all cursor-pointer",
                  distractionFree
                    ? "bg-[#d7f36a] text-[#17201b]"
                    : "hover:bg-[#202a23] text-zinc-400 hover:text-white"
                )}
                title="Zen Mode (F)"
                aria-label="Toggle Zen Mode"
              >
                {distractionFree ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}

            {/* Close Toolbar */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-[#202a23] text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Dismiss Toolbar"
              aria-label="Dismiss Toolbar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
                              SIDEBAR NAVIGATION DRAWER
      ========================================================================= */}
      {showSidebar && (
        <div className="pointer-events-auto absolute inset-y-0 left-0 w-80 sm:w-96 bg-[#17201b]/98 backdrop-blur-2xl border-r border-[#344137] text-zinc-100 shadow-2xl animate-in slide-in-from-left z-50 flex flex-col">
          <div className="p-4 border-b border-[#344137] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-[0.14em] font-semibold text-zinc-400">
                01 // Index
              </span>
              <button
                type="button"
                onClick={() => setShowSidebar(false)}
                className="p-1.5 hover:bg-[#202a23] text-zinc-500 hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Tab Control */}
            <div className="flex bg-[#121a15] border border-[#344137] p-1 rounded-xl">
              {[
                { id: "toc" as const, icon: List, label: "TOC" },
                { id: "bookmarks" as const, icon: Bookmark, label: "Marks" },
                { id: "highlights" as const, icon: Highlighter, label: "Notes" },
                { id: "search" as const, icon: Search, label: "Search" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    "flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer",
                    activeTab === t.id
                      ? "bg-[#d7f36a] text-[#17201b] font-bold shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                  title={t.label}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {/* Table of Contents */}
            {activeTab === "toc" &&
              (toc.length > 0 ? (
                toc.map((item, idx) => (
                  <button
                    key={item.id || idx}
                    type="button"
                    onClick={() => {
                      onNavigate(item.href);
                      setShowSidebar(false);
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-xl hover:bg-[#202a23] transition-colors text-xs font-mono text-zinc-300 hover:text-[#d7f36a] cursor-pointer border border-transparent hover:border-[#344137]"
                  >
                    {item.label}
                  </button>
                ))
              ) : (
                <p className="text-zinc-500 text-xs font-mono text-center mt-10">No chapters found</p>
              ))}

            {/* Bookmarks */}
            {activeTab === "bookmarks" &&
              (bookmarks.length > 0 ? (
                bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="group flex items-center justify-between rounded-xl bg-[#1b241e] border border-[#344137] hover:border-[#d7f36a]/30 p-3 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate(bm.cfi);
                        setShowSidebar(false);
                        onClose();
                      }}
                      className="min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <p className="font-mono text-xs text-zinc-200 truncate">{bm.label || "Bookmark"}</p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {new Date(bm.created_at).toLocaleDateString()}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteBookmark(bm.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-colors cursor-pointer"
                      title="Delete bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-zinc-500 text-xs font-mono text-center mt-10">No bookmarks saved</p>
              ))}

            {/* Highlights */}
            {activeTab === "highlights" &&
              (highlights.length > 0 ? (
                highlights.map((hl) => (
                  <button
                    key={hl.id}
                    type="button"
                    onClick={() => {
                      onNavigate(hl.cfi_range);
                      setShowSidebar(false);
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-xl bg-[#1b241e] hover:bg-[#202a23] border border-[#344137] transition-colors text-xs cursor-pointer space-y-1.5"
                    style={{ borderLeft: `3px solid ${hl.color || "#d7f36a"}` }}
                  >
                    {hl.text && <p className="italic text-zinc-300 line-clamp-2">&ldquo;{hl.text}&rdquo;</p>}
                    {hl.note && (
                      <div className="flex items-start gap-1.5 bg-[#121a15] p-2 rounded-lg border border-[#344137]">
                        <MessageSquare className="w-3 h-3 text-[#d7f36a] mt-0.5 shrink-0" />
                        <p className="text-[11px] text-zinc-300">{hl.note}</p>
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-500 font-mono">
                      {new Date(hl.created_at).toLocaleDateString()}
                    </p>
                  </button>
                ))
              ) : (
                <p className="text-zinc-500 text-xs font-mono text-center mt-10">No highlights created</p>
              ))}

            {/* In-Book Search */}
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
                    className="flex-1 bg-[#121a15] border border-[#344137] rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#d7f36a]/60"
                  />
                  <button
                    type="submit"
                    className="bg-[#d7f36a] hover:bg-[#e7f4ad] text-[#17201b] p-2 rounded-xl cursor-pointer transition-colors shadow-sm"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </form>

                <div className="space-y-2 mt-4">
                  {isSearching ? (
                    <p className="text-zinc-500 text-xs font-mono text-center mt-10">Searching document...</p>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((res, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onNavigate(res.cfi);
                          setShowSidebar(false);
                          onClose();
                        }}
                        className="w-full text-left p-3 rounded-xl bg-[#1b241e] border border-[#344137] hover:border-[#d7f36a]/40 transition-colors text-xs cursor-pointer"
                      >
                        <p
                          className="text-zinc-300 text-xs leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: res.excerpt }}
                        />
                      </button>
                    ))
                  ) : searchQuery ? (
                    <p className="text-zinc-500 text-xs font-mono text-center mt-10">No matches found</p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
                          BOTTOM TYPOGRAPHY & SETTINGS DRAWER
      ========================================================================= */}
      {showTypographyDrawer && (
        <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 animate-slide-up">
          <div className="bg-[#17201b]/98 backdrop-blur-2xl border border-[#344137] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#344137]">
              <span className="font-mono text-xs uppercase tracking-[0.14em] font-semibold text-zinc-400">
                Typography & Instrument Appearance
              </span>
              <button
                type="button"
                onClick={() => setShowTypographyDrawer(false)}
                className="p-1 text-zinc-500 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Reading Theme Selector */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-zinc-400">Canvas Surface</span>
              <div className="flex gap-2">
                {[
                  {
                    value: "light" as const,
                    label: "Light",
                    icon: Sun,
                    bg: "bg-white text-zinc-950",
                  },
                  {
                    value: "dark" as const,
                    label: "Dark",
                    icon: Moon,
                    bg: "bg-[#121a15] text-zinc-100 border border-[#344137]",
                  },
                  {
                    value: "sepia" as const,
                    label: "Paper",
                    icon: BookOpen,
                    bg: "bg-[#f4ecd8] text-[#5b4636]",
                  },
                ].map((theme) => (
                  <button
                    key={theme.value}
                    type="button"
                    onClick={() => onSettingsChange({ theme: theme.value })}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border",
                      settings.theme === theme.value
                        ? `${theme.bg} border-[#d7f36a] shadow-sm font-bold`
                        : "bg-[#1b241e] border-[#344137] text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <theme.icon className="w-3.5 h-3.5" />
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Stepper */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-zinc-400">Type Scale</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onSettingsChange({
                      fontSize: Math.max(60, settings.fontSize - 10),
                    })
                  }
                  className="p-1.5 rounded-xl bg-[#1b241e] border border-[#344137] hover:bg-[#202a23] text-zinc-400 transition-colors cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs w-12 text-center font-mono font-bold text-[#d7f36a]">
                  {settings.fontSize}%
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onSettingsChange({
                      fontSize: Math.min(200, settings.fontSize + 10),
                    })
                  }
                  className="p-1.5 rounded-xl bg-[#1b241e] border border-[#344137] hover:bg-[#202a23] text-zinc-400 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Typography Font Family */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-zinc-400">Typeface</span>
              <div className="flex gap-2">
                {[
                  { value: "serif" as const, label: "Serif" },
                  { value: "sans-serif" as const, label: "Sans" },
                  { value: "dyslexic" as const, label: "OpenDyslexic" },
                ].map((font) => (
                  <button
                    key={font.value}
                    type="button"
                    onClick={() => onSettingsChange({ fontFamily: font.value })}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border",
                      settings.fontFamily === font.value
                        ? "bg-[#d7f36a] border-[#d7f36a] text-[#17201b] font-bold shadow-sm"
                        : "bg-[#1b241e] border-[#344137] text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <Type className="w-3 h-3 inline mr-1" />
                    {font.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Publisher CSS Override */}
            <div className="flex items-center justify-between pt-1">
              <span className="font-mono text-xs text-zinc-400">Standardize CSS</span>
              <button
                type="button"
                onClick={() =>
                  onSettingsChange({ disablePublisherCSS: !settings.disablePublisherCSS })
                }
                className={cn(
                  "px-3 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer border",
                  settings.disablePublisherCSS
                    ? "bg-[#d7f36a] border-[#d7f36a] text-[#17201b] font-bold shadow-sm"
                    : "bg-[#1b241e] border-[#344137] text-zinc-400 hover:text-zinc-200"
                )}
              >
                {settings.disablePublisherCSS ? "Enabled" : "Original"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  Square
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
  toc: NavItem[];
  bookmarks?: BookmarkData[];
  highlights?: HighlightData[];
  estimatedTimeRemaining?: number | null;
  isBookmarked: boolean;
  onNavigate: (cfi: string) => void;
  onToggleBookmark: () => void;
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
  toc,
  bookmarks = [],
  highlights = [],
  estimatedTimeRemaining,
  isBookmarked,
  onNavigate,
  onToggleBookmark,
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
              onClick={() => {
                setShowSidebar(!showSidebar);
                if (!showSidebar) setActiveTab("toc");
              }}
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
          
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleBookmark}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Bookmark className={cn("w-5 h-5", isBookmarked ? "fill-current text-purple-400" : "")} />
            </button>
            <button
              onClick={onToggleTTS}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title={isReadingAloud ? "Stop Reading Aloud" : "Read Aloud"}
            >
              {isReadingAloud ? <Square className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="pointer-events-auto absolute inset-y-0 left-0 w-80 bg-black/90 backdrop-blur-xl text-white shadow-2xl animate-in slide-in-from-left z-50 flex flex-col">
          <div className="p-4 border-b border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Menu</h2>
              <button onClick={() => setShowSidebar(false)} className="p-2 hover:bg-white/10 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Tabs */}
            <div className="flex bg-white/10 p-1 rounded-lg">
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
                    "flex-1 p-1.5 flex justify-center items-center rounded-md transition-colors cursor-pointer",
                    activeTab === t.id ? "bg-purple-500 text-white" : "text-white/60 hover:text-white"
                  )}
                  title={t.title}
                >
                  <t.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
                    className="w-full text-left p-3 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))
              ) : (
                <p className="text-white/50 text-sm text-center mt-10">No chapters found</p>
              )
            )}

            {activeTab === "bookmarks" && (
              bookmarks.length > 0 ? (
                bookmarks.map((bm) => (
                  <button
                    key={bm.id}
                    onClick={() => {
                      onNavigate(bm.cfi);
                      setShowSidebar(false);
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-white/10 transition-colors text-sm cursor-pointer border-l-2 border-purple-500"
                  >
                    <p className="font-medium truncate">{bm.label || "Bookmark"}</p>
                    <p className="text-xs text-white/50 mt-1">{new Date(bm.created_at).toLocaleDateString()}</p>
                  </button>
                ))
              ) : (
                <p className="text-white/50 text-sm text-center mt-10">No bookmarks yet</p>
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
                    className="w-full text-left p-3 rounded-lg hover:bg-white/10 transition-colors text-sm cursor-pointer flex flex-col gap-1"
                    style={{ borderLeft: `4px solid ${hl.color}` }}
                  >
                    {hl.text && <p className="italic text-white/80 line-clamp-2">"{hl.text}"</p>}
                    {hl.note && (
                      <div className="flex items-start gap-1.5 mt-2 bg-white/5 p-2 rounded-md">
                        <MessageSquare className="w-3 h-3 text-white/50 mt-0.5 shrink-0" />
                        <p className="text-xs text-white/90">{hl.note}</p>
                      </div>
                    )}
                    <p className="text-[10px] text-white/40 mt-1">{new Date(hl.created_at).toLocaleDateString()}</p>
                  </button>
                ))
              ) : (
                <p className="text-white/50 text-sm text-center mt-10">No highlights yet</p>
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
                    className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button type="submit" className="bg-purple-500 p-2 rounded-lg cursor-pointer hover:bg-purple-600 transition-colors">
                    <Search className="w-4 h-4" />
                  </button>
                </form>
                
                <div className="space-y-2 mt-4">
                  {isSearching ? (
                    <p className="text-white/50 text-sm text-center mt-10">Searching...</p>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((res, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          onNavigate(res.cfi);
                          setShowSidebar(false);
                          onClose();
                        }}
                        className="w-full text-left p-3 rounded-lg hover:bg-white/10 transition-colors text-sm cursor-pointer"
                      >
                        <p className="text-white/80 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: res.excerpt }} />
                      </button>
                    ))
                  ) : searchQuery ? (
                    <p className="text-white/50 text-sm text-center mt-10">No results found</p>
                  ) : null}
                </div>
              </div>
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
          
          {/* Custom CSS Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60 uppercase tracking-wider">
              Disable Publisher CSS
            </span>
            <button
              onClick={() => onSettingsChange({ disablePublisherCSS: !settings.disablePublisherCSS })}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                settings.disablePublisherCSS
                  ? "bg-purple-500 text-white"
                  : "bg-white/10 hover:bg-white/20"
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

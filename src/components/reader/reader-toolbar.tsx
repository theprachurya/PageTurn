"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
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
  const [chapterProgress, setChapterProgress] = useState(progress);

  const flatToc = useMemo(() => {
    const flatten = (items: NavItem[]): NavItem[] =>
      items.flatMap((item) => [item, ...(item.subitems ? flatten(item.subitems) : [])]);
    return flatten(toc);
  }, [toc]);

  const currentChapterIndex = useMemo(() => {
    if (!chapter) return -1;
    return flatToc.findIndex((item) => item.label.trim() === chapter.trim());
  }, [chapter, flatToc]);

  const previousChapter = currentChapterIndex > 0 ? flatToc[currentChapterIndex - 1] : null;
  const nextChapter = currentChapterIndex >= 0 && currentChapterIndex < flatToc.length - 1
    ? flatToc[currentChapterIndex + 1]
    : null;

  useEffect(() => {
    if (!visible) return;

    const updateChapterProgress = () => {
      let measured = false;
      const centerY = window.innerHeight / 2;
      const iframes = Array.from(document.querySelectorAll("iframe"));

      for (const iframe of iframes) {
        const rect = iframe.getBoundingClientRect();
        if (centerY < rect.top || centerY > rect.bottom) continue;

        try {
          const doc = iframe.contentDocument;
          if (!doc) continue;

          const scrollingElement = doc.scrollingElement || doc.documentElement;
          const maxScroll = Math.max(0, scrollingElement.scrollHeight - scrollingElement.clientHeight);
          if (maxScroll > 0) {
            setChapterProgress(Math.max(0, Math.min(100, (scrollingElement.scrollTop / maxScroll) * 100)));
            measured = true;
          }
        } catch {
          // EPUB iframe may not be accessible while it is being replaced.
        }
        break;
      }

      if (!measured) setChapterProgress(progress);
    };

    updateChapterProgress();
    const interval = window.setInterval(updateChapterProgress, 250);
    window.addEventListener("resize", updateChapterProgress);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", updateChapterProgress);
    };
  }, [visible, progress, chapter]);

  const navigateChapter = (item: NavItem | null) => {
    if (!item) return;
    onNavigate(item.href);
    setShowSidebar(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none text-zinc-100 font-sans">
      <div className="pointer-events-auto absolute top-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-xl text-zinc-100 p-4 border-b border-zinc-800/80 animate-fade-in shadow-2xl">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => router.push("/shelf")} className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer" title="Back to shelf">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button onClick={() => { setShowSidebar(!showSidebar); if (!showSidebar) setActiveTab("toc"); }} className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer" title="Table of contents">
                <Menu className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center flex-1 mx-4 min-w-0">
              <p className="text-sm font-semibold truncate text-zinc-100">{chapter || "Reading"}</p>
              <p className="text-xs text-zinc-400 font-mono">{Math.round(chapterProgress)}% chapter · {Math.round(progress)}% book</p>
              <div className="mt-2 h-1.5 w-full max-w-sm mx-auto rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-200" style={{ width: `${chapterProgress}%` }} />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => navigateChapter(previousChapter)} disabled={!previousChapter} className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white disabled:text-zinc-700 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer" title={previousChapter ? `Previous: ${previousChapter.label}` : "No previous chapter"}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => navigateChapter(nextChapter)} disabled={!nextChapter} className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white disabled:text-zinc-700 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer" title={nextChapter ? `Next: ${nextChapter.label}` : "No next chapter"}>
                <ChevronRight className="w-5 h-5" />
              </button>
              <button onClick={onToggleBookmark} className="p-2 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer" title="Bookmark">
                <Bookmark className={cn("w-5 h-5", isBookmarked ? "fill-current text-red-500" : "text-zinc-400")} />
              </button>
              <button onClick={onToggleTTS} className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer" title={isReadingAloud ? "Stop Reading Aloud" : "Read Aloud"}>
                {isReadingAloud ? <Square className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5 text-zinc-400" />}
              </button>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer" title="Close controls">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSidebar && (
        <div className="pointer-events-auto absolute inset-y-0 left-0 w-80 bg-zinc-950/95 backdrop-blur-2xl border-r border-zinc-800/80 text-zinc-100 shadow-2xl animate-in slide-in-from-left z-50 flex flex-col">
          <div className="p-4 border-b border-zinc-800/80 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-zinc-100">Navigation</h2>
              <button onClick={() => setShowSidebar(false)} className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
              {[
                { id: "toc" as const, icon: List, title: "TOC" },
                { id: "bookmarks" as const, icon: Bookmark, title: "Bookmarks" },
                { id: "highlights" as const, icon: Highlighter, title: "Highlights" },
                { id: "search" as const, icon: Search, title: "Search" },
              ].map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={cn("flex-1 p-2 flex justify-center items-center rounded-lg transition-colors cursor-pointer", activeTab === t.id ? "bg-red-600 text-white shadow-md shadow-red-950/50" : "text-zinc-400 hover:text-zinc-200")} title={t.title}><t.icon className="w-4 h-4" /></button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {activeTab === "toc" && (toc.length > 0 ? toc.map((item, idx) => (
              <div key={item.id || idx} className="space-y-1">
                <button onClick={() => navigateChapter(item)} className="w-full text-left p-3 rounded-xl hover:bg-zinc-900 transition-colors text-sm font-medium text-zinc-300 hover:text-zinc-100 cursor-pointer border border-transparent hover:border-zinc-800">{item.label}</button>
                {item.subitems?.map((subitem) => <button key={subitem.id} onClick={() => navigateChapter(subitem)} className="w-full text-left pl-6 pr-3 py-2 rounded-lg hover:bg-zinc-900 transition-colors text-xs text-zinc-400 hover:text-zinc-100 cursor-pointer">{subitem.label}</button>)}
              </div>
            )) : <p className="text-zinc-500 text-sm text-center mt-10 font-mono">No chapters found</p>)}

            {activeTab === "bookmarks" && (bookmarks.length > 0 ? bookmarks.map((bm) => (
              <button key={bm.id} onClick={() => { onNavigate(bm.cfi); setShowSidebar(false); onClose(); }} className="w-full text-left p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 transition-colors text-sm cursor-pointer border-l-4 border-l-red-500">
                <p className="font-semibold text-zinc-100 truncate">{bm.label || "Bookmark"}</p>
                <p className="text-xs text-zinc-500 font-mono mt-1">{new Date(bm.created_at).toLocaleDateString()}</p>
              </button>
            )) : <p className="text-zinc-500 text-sm text-center mt-10 font-mono">No bookmarks yet</p>)}

            {activeTab === "highlights" && (highlights.length > 0 ? highlights.map((hl) => (
              <button key={hl.id} onClick={() => { onNavigate(hl.cfi_range); setShowSidebar(false); onClose(); }} className="w-full text-left p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 transition-colors text-sm cursor-pointer flex flex-col gap-1.5" style={{ borderLeft: `4px solid ${hl.color || '#ef4444'}` }}>
                {hl.text && <p className="italic text-zinc-300 text-xs line-clamp-2">&quot;{hl.text}&quot;</p>}
                {hl.note && <div className="flex items-start gap-1.5 mt-1.5 bg-zinc-950 p-2 rounded-lg border border-zinc-800"><MessageSquare className="w-3 h-3 text-red-400 mt-0.5 shrink-0" /><p className="text-xs text-zinc-200">{hl.note}</p></div>}
                <p className="text-[10px] text-zinc-500 font-mono mt-1">{new Date(hl.created_at).toLocaleDateString()}</p>
              </button>
            )) : <p className="text-zinc-500 text-sm text-center mt-10 font-mono">No highlights yet</p>)}

            {activeTab === "search" && (
              <div className="space-y-4">
                <form onSubmit={(e) => { e.preventDefault(); if (onSearch && searchQuery.trim()) onSearch(searchQuery); }} className="flex gap-2">
                  <input type="text" placeholder="Search in book..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-600" />
                  <button type="submit" className="bg-red-600 p-2.5 rounded-xl cursor-pointer hover:bg-red-500 transition-colors shadow-md text-white"><Search className="w-4 h-4" /></button>
                </form>
                <div className="space-y-2 mt-4">
                  {isSearching ? <p className="text-zinc-500 text-sm text-center mt-10 font-mono">Searching...</p> : searchResults.length > 0 ? searchResults.map((res, idx) => (
                    <button key={idx} onClick={() => { onNavigate(res.cfi); setShowSidebar(false); onClose(); }} className="w-full text-left p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-800 transition-colors text-sm cursor-pointer"><p className="text-zinc-300 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: res.excerpt }} /></button>
                  )) : searchQuery ? <p className="text-zinc-500 text-sm text-center mt-10 font-mono">No results found</p> : null}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pointer-events-auto absolute bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/80 text-zinc-100 p-4 animate-fade-in shadow-2xl">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Theme</span>
            <div className="flex gap-2">
              {[
                { value: "light" as const, label: "Light", icon: Sun, bg: "bg-white", text: "text-slate-900 font-semibold" },
                { value: "dark" as const, label: "Dark", icon: Moon, bg: "bg-zinc-900 border border-zinc-700", text: "text-white font-semibold" },
                { value: "sepia" as const, label: "Sepia", icon: BookOpen, bg: "bg-[#f4ecd8]", text: "text-[#5b4636] font-semibold" },
              ].map((theme) => <button key={theme.value} onClick={() => onSettingsChange({ theme: theme.value })} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border", settings.theme === theme.value ? `${theme.bg} ${theme.text} shadow-md border-red-500/50` : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200")}><theme.icon className="w-3 h-3" />{theme.label}</button>)}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Font Size</span>
            <div className="flex items-center gap-3">
              <button onClick={() => onSettingsChange({ fontSize: Math.max(60, settings.fontSize - 10) })} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"><Minus className="w-4 h-4" /></button>
              <span className="text-sm w-12 text-center font-mono font-bold text-red-400">{settings.fontSize}%</span>
              <button onClick={() => onSettingsChange({ fontSize: Math.min(200, settings.fontSize + 10) })} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"><Plus className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Typography</span>
            <div className="flex gap-2">
              {[
                { value: "serif" as const, label: "Serif" },
                { value: "sans-serif" as const, label: "Sans" },
                { value: "dyslexic" as const, label: "Dyslexic" },
              ].map((font) => <button key={font.value} onClick={() => onSettingsChange({ fontFamily: font.value })} className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border", settings.fontFamily === font.value ? "bg-red-600 border-red-500 text-white font-semibold shadow-md" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200")}><Type className="w-3 h-3 inline mr-1" />{font.label}</button>)}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Disable Publisher CSS</span>
            <button onClick={() => onSettingsChange({ disablePublisherCSS: !settings.disablePublisherCSS })} className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border", settings.disablePublisherCSS ? "bg-red-600 border-red-500 text-white font-semibold shadow-md" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200")}>{settings.disablePublisherCSS ? "On" : "Off"}</button>
          </div>

          {estimatedTimeRemaining !== null && estimatedTimeRemaining !== undefined && <p className="text-xs text-zinc-500 text-right font-mono">~{estimatedTimeRemaining} min remaining</p>}
        </div>
      </div>
    </div>
  );
}

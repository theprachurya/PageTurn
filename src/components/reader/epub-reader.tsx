"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ePub, { type Book, type Rendition } from "epubjs";
import { createClient } from "@/lib/supabase/client";
import {
  getReaderSettings,
  saveReaderSettings,
  type ReaderSettings,
} from "@/lib/reader-settings";
import { ReaderToolbar, type NavItem, type BookmarkData, type HighlightData } from "./reader-toolbar";
import { DictionaryPopover } from "./dictionary-popover";
import { HighlightActionBar } from "./highlight-action-bar";

interface EpubReaderProps {
  bookId: string;
  epubUrl: string | ArrayBuffer;
  initialCfi?: string | null;
  initialProgress?: number;
}

export function EpubReader({
  bookId,
  epubUrl,
  initialCfi,
  initialProgress = 0,
}: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const sessionStartRef = useRef<Date>(new Date());
  
  const [showToolbar, setShowToolbar] = useState(false);
  const [currentCfi, setCurrentCfi] = useState(initialCfi || "");
  const [progress, setProgress] = useState(initialProgress);
  const [chapter, setChapter] = useState("");
  const [toc, setToc] = useState<NavItem[]>([]);
  const [settings, setSettings] = useState<ReaderSettings>(getReaderSettings());
  
  // Phase 1 State
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [highlights, setHighlights] = useState<HighlightData[]>([]);
  const [searchResults, setSearchResults] = useState<{ cfi: string; excerpt: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [selection, setSelection] = useState<{ cfiRange: string; text: string; x: number; y: number } | null>(null);
  const [dictionaryWord, setDictionaryWord] = useState<{ word: string; x: number; y: number } | null>(null);
  const [syncPrompt, setSyncPrompt] = useState<{ cfi: string; date: string } | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current && typeof window !== "undefined") {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current!;

  // Load Bookmarks & Highlights
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [bmRes, hlRes] = await Promise.all([
        supabase.from("bookmarks").select("*").eq("book_id", bookId).eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("highlights").select("*").eq("book_id", bookId).eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (bmRes.data) setBookmarks(bmRes.data);
      if (hlRes.data) setHighlights(hlRes.data);
    }
    loadData();
  }, [bookId, supabase]);

  // Real-time Sync Subscription
  useEffect(() => {
    const channel = supabase
      .channel(`sync_${bookId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_books", filter: `book_id=eq.${bookId}` },
        (payload) => {
          const newData = payload.new as any;
          if (newData.current_cfi && newData.current_cfi !== currentCfi) {
            // Check if the update is from another session (time check)
            const timeDiff = new Date().getTime() - new Date(newData.last_read_at).getTime();
            if (timeDiff < 10000) { // If updated in the last 10 seconds
              setSyncPrompt({ cfi: newData.current_cfi, date: newData.last_read_at });
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookId, currentCfi, supabase]);

  // Apply settings to rendition
  const applySettings = useCallback((rendition: Rendition, s: ReaderSettings) => {
    const themes = {
      light: { body: { background: "#ffffff", color: "#1a1a2e" } },
      dark: { body: { background: "#1a1a2e", color: "#e2e8f0" } },
      sepia: { body: { background: "#f4ecd8", color: "#5b4636" } },
    };

    const fontFamilies = {
      serif: "Georgia, 'Times New Roman', serif",
      "sans-serif": "'Geist', system-ui, sans-serif",
      dyslexic: "OpenDyslexic, 'Comic Sans MS', sans-serif",
    };

    Object.entries(themes).forEach(([name, styles]) => {
      rendition.themes.register(name, styles);
    });
    rendition.themes.select(s.theme);
    rendition.themes.fontSize(`${s.fontSize}%`);
    rendition.themes.override("font-family", fontFamilies[s.fontFamily]);

    if (s.disablePublisherCSS) {
      rendition.themes.override("font-family", fontFamilies[s.fontFamily]);
      rendition.themes.override("line-height", "1.6");
      rendition.themes.override("text-align", "left");
    }
  }, []);

  // Save progress to database (debounced)
  const saveProgress = useCallback((cfi: string, pct: number) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("user_books")
        .update({
          current_cfi: cfi,
          progress_percentage: Math.min(pct, 100),
          last_read_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("book_id", bookId);
    }, 3000);
  }, [bookId, supabase]);

  // Log reading session on unmount
  const logSession = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const endTime = new Date();
    const durationMs = endTime.getTime() - sessionStartRef.current.getTime();
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    if (durationMs < 30000) return;

    await supabase.from("reading_sessions").insert({
      user_id: user.id,
      book_id: bookId,
      session_date: new Date().toISOString().split("T")[0],
      start_time: sessionStartRef.current.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: durationMinutes,
      chapter_name: chapter || null,
    });
  }, [bookId, chapter, supabase]);

  // Initialize epub.js
  useEffect(() => {
    if (!viewerRef.current) return;

    const book = ePub(epubUrl);
    bookRef.current = book;

    const rendition = book.renderTo(viewerRef.current, {
      width: "100%",
      height: "100%",
      flow: "scrolled-doc",
      spread: "none",
      manager: "continuous",
    });

    renditionRef.current = rendition;

    applySettings(rendition, settings);

    if (currentCfi) {
      rendition.display(currentCfi);
    } else if (initialCfi) {
      rendition.display(initialCfi);
    } else {
      rendition.display();
    }

    // Extract TOC
    book.loaded.navigation.then((nav) => {
      if (nav && nav.toc) {
        setToc(nav.toc as unknown as NavItem[]);
      }
    });

    rendition.on("relocated", ((...args: unknown[]) => {
      const location = args[0] as { start: { cfi: string; displayed: { page: number; total: number } }; atEnd: boolean };
      const cfi = location.start.cfi;
      setCurrentCfi(cfi);
      setSelection(null); // Clear selection on navigate

      if (book.locations.length() > 0) {
        const pct = book.locations.percentageFromCfi(cfi) * 100;
        setProgress(pct);
        saveProgress(cfi, pct);
      }

      // Re-apply highlights after relocating (safest place to apply them)
      setTimeout(() => {
        highlights.forEach(hl => {
          try {
            rendition.annotations.highlight(hl.cfi_range, {}, () => {}, "", { fill: hl.color, "fill-opacity": "0.3" });
          } catch (e) { }
        });
      }, 100);
    }));

    rendition.on("rendered", ((...args: unknown[]) => {
      const section = args[0] as { href: string };
      const currentToc = book.navigation?.toc;
      if (currentToc) {
        const match = currentToc.find(
          (item: { href: string }) => section.href.includes(item.href)
        );
        if (match) setChapter((match as { label: string }).label?.trim() || "");
      }
    }));

    // Text Selection
    rendition.on("selected", ((...args: unknown[]) => {
      const cfiRange = args[0] as string;
      const contents = args[1] as any;
      const range = contents.window.getSelection().getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const text = contents.window.getSelection().toString();
      
      setSelection({
        cfiRange,
        text,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }));

    // Iframe clicks (events inside the epub don't bubble to the parent div)
    rendition.on("click", (e: any) => {
      // In scrolled mode, clicks always toggle the toolbar rather than turning pages
      setShowToolbar(prev => !prev);
    });

    book.ready.then(() => {
      return book.locations.generate(1600);
    });

    const keyupHandler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") rendition.prev();
      if (e.key === "ArrowRight") rendition.next();
    };

    rendition.on("keyup", ((...args: unknown[]) => {
      const e = args[0] as KeyboardEvent;
      keyupHandler(e);
    }));

    document.addEventListener("keyup", keyupHandler);

    return () => {
      logSession();
      document.removeEventListener("keyup", keyupHandler);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      rendition.destroy();
      book.destroy();
    };
  }, [epubUrl]); // Only re-render when epubUrl changes

  const updateSettings = (newSettings: Partial<ReaderSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveReaderSettings(newSettings);
    
    if (renditionRef.current) {
      applySettings(renditionRef.current, updated);
    }
  };

  const goNext = () => { renditionRef.current?.next(); setSelection(null); };
  const goPrev = () => { renditionRef.current?.prev(); setSelection(null); };
  const navigateTo = (href: string) => { renditionRef.current?.display(href); setSelection(null); };

  const handleCenterTap = (e: React.MouseEvent) => {
    if (selection || dictionaryWord) {
      setSelection(null);
      setDictionaryWord(null);
      return;
    }

    // Since we are always scrolling now, any tap toggles the toolbar
    setShowToolbar(!showToolbar);
  };

  // Actions
  const handleToggleBookmark = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existing = bookmarks.find(b => b.cfi === currentCfi);
    if (existing) {
      await supabase.from("bookmarks").delete().eq("id", existing.id);
      setBookmarks(bookmarks.filter(b => b.id !== existing.id));
    } else {
      const { data } = await supabase.from("bookmarks").insert({
        user_id: user.id,
        book_id: bookId,
        cfi: currentCfi,
        label: chapter || "Bookmark",
      }).select().single();
      
      if (data) setBookmarks([data, ...bookmarks]);
    }
  };

  const handleAddHighlight = async (color: string) => {
    if (!selection) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from("highlights").insert({
      user_id: user.id,
      book_id: bookId,
      cfi_range: selection.cfiRange,
      color,
      note: selection.text.slice(0, 100), // using note as snippet storage for now
    }).select().single();

    if (data) {
      setHighlights([{ ...data, text: selection.text }, ...highlights]);
    }
    setSelection(null);
  };

  const handleSearch = async (query: string) => {
    if (!bookRef.current || !query.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const book = bookRef.current;
      const results: { cfi: string; excerpt: string }[] = [];
      const q = query.toLowerCase();

      // @ts-ignore: spine is accessible
      for (const item of book.spine.spineItems) {
        await item.load(book.load.bind(book));
        const text = item.document.body.textContent?.toLowerCase() || "";
        
        let idx = text.indexOf(q);
        while (idx !== -1) {
          // Extract snippet
          const start = Math.max(0, idx - 40);
          const end = Math.min(text.length, idx + q.length + 40);
          let excerpt = item.document.body.textContent?.substring(start, end) || "";
          // Highlight term in excerpt
          const matchRegex = new RegExp(query, 'gi');
          excerpt = excerpt.replace(matchRegex, (match: string) => `<strong class="text-purple-400">${match}</strong>`);
          
          // Generate CFI for this match (rough approximation for search results)
          const cfi = item.cfiFromElement(item.document.body);
          
          results.push({ cfi, excerpt: `...${excerpt}...` });
          
          idx = text.indexOf(q, idx + q.length);
          if (results.length > 50) break; // Limit
        }
        item.unload();
      }
      setSearchResults(results);
    } catch (e) {
      console.error("Search error", e);
    } finally {
      setIsSearching(false);
    }
  };

  const bgColors = { light: "bg-white", dark: "bg-[#1a1a2e]", sepia: "bg-[#f4ecd8]" };
  const isBookmarked = bookmarks.some(b => b.cfi === currentCfi);

  return (
    <div className={`fixed inset-0 ${bgColors[settings.theme]} flex flex-col`}>
      
      {/* Real-time Sync Prompt */}
      {syncPrompt && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-purple-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-5">
          <span className="text-sm">Synced to a newer position on another device.</span>
          <div className="flex gap-2">
            <button onClick={() => { navigateTo(syncPrompt.cfi); setSyncPrompt(null); }} className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors cursor-pointer">Jump</button>
            <button onClick={() => setSyncPrompt(null)} className="px-3 py-1 hover:bg-white/10 rounded text-sm transition-colors cursor-pointer">Dismiss</button>
          </div>
        </div>
      )}

      {/* Floating Action Bars */}
      {selection && (
        <HighlightActionBar
          x={selection.x}
          y={selection.y}
          onHighlight={handleAddHighlight}
          onDefine={() => {
            const word = selection.text.trim().split(" ")[0]; // Take first word
            setDictionaryWord({ word, x: selection.x, y: selection.y });
            setSelection(null);
          }}
          onClose={() => setSelection(null)}
        />
      )}

      {dictionaryWord && (
        <DictionaryPopover
          word={dictionaryWord.word}
          x={dictionaryWord.x}
          y={dictionaryWord.y}
          onClose={() => setDictionaryWord(null)}
        />
      )}

      <ReaderToolbar
        visible={showToolbar}
        settings={settings}
        onSettingsChange={updateSettings}
        chapter={chapter}
        progress={progress}
        toc={toc}
        bookmarks={bookmarks}
        highlights={highlights}
        isBookmarked={isBookmarked}
        onNavigate={navigateTo}
        onToggleBookmark={handleToggleBookmark}
        onSearch={handleSearch}
        searchResults={searchResults}
        isSearching={isSearching}
        onClose={() => setShowToolbar(false)}
      />

      <div className="flex-1 overflow-hidden flex justify-center w-full">
        <div
          ref={viewerRef}
          onClick={handleCenterTap}
          className="w-full max-w-3xl h-full shadow-sm"
        />
      </div>

      <div className={`h-1 ${settings.theme === "dark" ? "bg-slate-700" : "bg-gray-200"}`}>
        <div
          className="h-full bg-gradient-to-r from-purple-400 to-lavender-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

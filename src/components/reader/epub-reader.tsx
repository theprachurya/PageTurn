"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ePub, { type Book, type Rendition } from "epubjs";
import { createClient } from "@/lib/supabase/client";
import {
  getReaderSettings,
  saveReaderSettings,
  type ReaderSettings,
} from "@/lib/reader-settings";
import { enqueue, initOfflineSync } from "@/lib/offline-queue";
import {
  getBookmarks,
  addBookmark as addBookmarkAction,
  removeBookmark as removeBookmarkAction,
} from "@/app/actions/reader.actions";
import { ReaderToolbar, type NavItem, type BookmarkData, type HighlightData } from "./reader-toolbar";
import { DictionaryPopover } from "./dictionary-popover";
import { HighlightPopover, type HighlightColor } from "./highlight-popover";
import { useHighlights } from "@/lib/hooks/use-highlights";

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
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const sessionWordsReadRef = useRef<number>(0);
  const wpmRef = useRef<number>(250); // Default average WPM
  
  // Phase 1 State
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [searchResults, setSearchResults] = useState<{ cfi: string; excerpt: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { highlights, addHighlight, removeHighlight, updateHighlightNote } = useHighlights(bookId);

  const [selection, setSelection] = useState<{ cfiRange: string; text: string; x: number; y: number } | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [activeHighlightPos, setActiveHighlightPos] = useState<{ x: number, y: number } | null>(null);
  
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const [dictionaryWord, setDictionaryWord] = useState<{ word: string; x: number; y: number } | null>(null);
  const [syncPrompt, setSyncPrompt] = useState<{ cfi: string; date: string } | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // We still need the Supabase client for Realtime subscriptions (client-only)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current && typeof window !== "undefined") {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current!;

  // Initialize offline sync listener once
  useEffect(() => {
    initOfflineSync();
  }, []);

  // Load Bookmarks via Server Actions
  useEffect(() => {
    async function loadData() {
      try {
        const bm = await getBookmarks(bookId);
        setBookmarks(bm);
      } catch (err) {
        console.error("Failed to load bookmarks:", err);
      }
    }
    loadData();
  }, [bookId]);

  // Real-time Sync Subscription (must stay client-side)
  useEffect(() => {
    const channel = supabase
      .channel(`sync_${bookId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_books", filter: `book_id=eq.${bookId}` },
        (payload) => {
          const newData = payload.new as any;
          if (newData.current_cfi && newData.current_cfi !== currentCfi) {
            const timeDiff = new Date().getTime() - new Date(newData.last_read_at).getTime();
            if (timeDiff < 10000) {
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
      light: { 
        body: { background: "#ffffff", color: "#18181b", padding: "2rem 5% !important", "overflow-x": "hidden !important" },
        img: { "max-width": "100% !important", height: "auto !important" },
        svg: { "max-width": "100% !important", height: "auto !important" }
      },
      dark: { 
        body: { background: "#0f0f12", color: "#f4f4f5", padding: "2rem 5% !important", "overflow-x": "hidden !important" },
        img: { "max-width": "100% !important", height: "auto !important" },
        svg: { "max-width": "100% !important", height: "auto !important" }
      },
      sepia: { 
        body: { background: "#f4ecd8", color: "#5b4636", padding: "2rem 5% !important", "overflow-x": "hidden !important" },
        img: { "max-width": "100% !important", height: "auto !important" },
        svg: { "max-width": "100% !important", height: "auto !important" }
      },
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

    // Always override background and color so dark/sepia modes work regardless of publisher CSS
    rendition.themes.override("background", themes[s.theme as keyof typeof themes].body.background);
    rendition.themes.override("color", themes[s.theme as keyof typeof themes].body.color);

    if (s.disablePublisherCSS) {
      rendition.themes.override("line-height", "1.6");
      rendition.themes.override("text-align", "left");
      rendition.themes.override("padding", "2rem 5%");
    } else {
      rendition.themes.override("line-height", "inherit");
      rendition.themes.override("text-align", "inherit");
      rendition.themes.override("padding", "inherit");
    }
  }, []);

  // Save progress via offline queue (debounced)
  const saveProgress = useCallback((cfi: string, pct: number) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await enqueue({
        type: "syncProgress",
        args: { bookId, cfi, progressPercentage: Math.min(pct, 100) },
      });
    }, 3000);
  }, [bookId]);

  // Log reading session on unmount via offline queue
  const logSession = useCallback(async () => {
    const endTime = new Date();
    const durationMs = endTime.getTime() - sessionStartRef.current.getTime();
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    if (durationMs < 30000) return;

    await enqueue({
      type: "logSession",
      args: {
        bookId,
        startTime: sessionStartRef.current.toISOString(),
        endTime: endTime.toISOString(),
        durationMinutes,
        chapterName: chapter || null,
        wordsRead: sessionWordsReadRef.current,
      },
    });
  }, [bookId, chapter]);

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

    (rendition as any).hooks.content.register((contents: any) => {
      const style = contents.document.createElement("style");
      style.innerHTML = `
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(239, 68, 68, 0.4); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(239, 68, 68, 0.8); }
        ::selection { background: rgba(239, 68, 68, 0.3); }
        .epub-highlight { fill-opacity: 0.3 !important; mix-blend-mode: multiply; }
      `;
      contents.document.head.appendChild(style);
    });


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
      setSelection(null);

      if (book.locations.length() > 0) {
        const pct = book.locations.percentageFromCfi(cfi) * 100;
        setProgress(pct);
        saveProgress(cfi, pct);
      }

      // Re-apply highlights after relocating
      setTimeout(() => {
        highlights.forEach(hl => {
          try {
            rendition.annotations.highlight(hl.cfi_range, {}, () => {}, "epub-highlight", { fill: hl.color });
          } catch (e) { }
          // Calculate words on screen for WPM estimation
      try {
        const range = (rendition as any).getRange(location.start.cfi);
        // getRange only gets a single node usually, but we can roughly estimate words per page
        // A standard screen page has ~250 words
        sessionWordsReadRef.current += 250;
        
        // Update rolling WPM estimation if they've been reading for at least a minute
        const elapsedMinutes = (new Date().getTime() - sessionStartRef.current.getTime()) / 60000;
        if (elapsedMinutes > 1) {
          wpmRef.current = Math.max(100, Math.min(1000, Math.round(sessionWordsReadRef.current / elapsedMinutes)));
        }

        // Estimate remaining time in book based on progress
        const remainingProgress = 1 - (progress / 100);
        // If we assume a typical book has 80,000 words:
        const assumedTotalWords = 80000;
        const remainingWords = assumedTotalWords * remainingProgress;
        setEstimatedTimeRemaining(Math.round(remainingWords / wpmRef.current));
      } catch (e) {
        console.warn("Failed to calculate words", e);
      }
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
      
      const iframe = viewerRef.current?.querySelector("iframe");
      if (iframe) {
        const iframeRect = iframe.getBoundingClientRect();
        setSelection({
          cfiRange,
          text,
          x: iframeRect.left + rect.left + rect.width / 2,
          y: iframeRect.top + rect.top,
        });
      } else {
        setSelection({
          cfiRange,
          text,
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
      }
      setActiveHighlightId(null);
    }));

    // Existing Highlight Click
    rendition.on("markClicked", (cfiRange: any, data: any, contents: any) => {
      const highlight = highlights.find(h => h.cfi_range === cfiRange);
      if (highlight) {
        setActiveHighlightId(highlight.id);
        
        try {
          const range = contents.document.querySelector(`[data-epubcfi="${cfiRange}"]`);
          const rect = range ? range.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2 };
          
          const iframe = viewerRef.current?.querySelector("iframe");
          if (iframe && range) {
            const iframeRect = iframe.getBoundingClientRect();
            setActiveHighlightPos({ 
              x: iframeRect.left + rect.left + rect.width / 2, 
              y: iframeRect.top + rect.top 
            });
          } else {
            setActiveHighlightPos({ x: rect.left, y: rect.top });
          }
        } catch(e) {
          setActiveHighlightPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        }
      }
    });

    // Iframe clicks (only toggle on pure left clicks, not selections or middle clicks)
    rendition.on("click", (e: any) => {
      // Ignore right or middle clicks (button 1 or 2)
      if (e && e.button !== undefined && e.button !== 0) return;

      // Ignore if text is selected in the iframe
      const iframe = viewerRef.current?.querySelector("iframe");
      if (iframe?.contentWindow) {
        const selection = iframe.contentWindow.getSelection();
        if (selection && selection.toString().length > 0) return;
      }

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
  }, [epubUrl]);

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
    if (e.button !== 0) return; // Only allow left clicks
    if (selection || dictionaryWord) {
      setSelection(null);
      setDictionaryWord(null);
      return;
    }
    setShowToolbar(!showToolbar);
  };

  // ─── Actions (now via Server Actions / Offline Queue) ────────

  const handleToggleBookmark = async () => {
    // Snapshot bookmarks at the time of click to avoid stale closure
    const snapshot = bookmarks;
    const existing = snapshot.find(b => b.cfi === currentCfi);
    if (existing) {
      // Optimistically remove immediately so UI reflects change
      setBookmarks(prev => prev.filter(b => b.id !== existing.id));
      try {
        await removeBookmarkAction(existing.id);
      } catch (err) {
        console.error("Failed to remove bookmark:", err);
        // Rollback on failure
        setBookmarks(prev => [existing, ...prev]);
      }
    } else {
      try {
        const data = await addBookmarkAction(bookId, currentCfi, chapter || "Bookmark");
        if (data) setBookmarks(prev => [data, ...prev]);
      } catch (err) {
        // If offline, queue it and add optimistically
        await enqueue({
          type: "addBookmark",
          args: { bookId, cfi: currentCfi, label: chapter || "Bookmark" },
        });
        const optimistic = {
          id: crypto.randomUUID(),
          cfi: currentCfi,
          label: chapter || "Bookmark",
          created_at: new Date().toISOString(),
        };
        setBookmarks(prev => [optimistic, ...prev]);
      }
    }
  };

  const handleSaveHighlight = async (color: HighlightColor, note?: string) => {
    if (!selection) return;

    try {
      const newHighlight = await addHighlight({
        book_id: bookId,
        cfi_range: selection.cfiRange,
        color,
        note,
        text: selection.text,
      });

      if (newHighlight && renditionRef.current) {
        // Optimistically apply it to iframe
        try {
          renditionRef.current.annotations.highlight(
            selection.cfiRange,
            {},
            () => {},
            "epub-highlight",
            { fill: color }
          );
        } catch (e) {
          console.error("Failed to apply highlight in rendition", e);
        }
      }
    } catch (err) {
      console.error("Highlight save failed", err);
    }

    // Clear selection
    setSelection(null);
    if (viewerRef.current) {
      const iframe = viewerRef.current.querySelector("iframe");
      if (iframe?.contentWindow) {
        iframe.contentWindow.getSelection()?.removeAllRanges();
      }
    }
  };

  const handleUpdateExistingHighlight = async (color: HighlightColor, note?: string) => {
    if (activeHighlightId && note !== undefined) {
      await updateHighlightNote(activeHighlightId, note);
    }
    setActiveHighlightId(null);
  };

  const handleDeleteHighlight = async () => {
    if (activeHighlightId) {
      const highlight = highlights.find(h => h.id === activeHighlightId);
      if (highlight && renditionRef.current) {
        renditionRef.current.annotations.remove(highlight.cfi_range, "highlight");
      }
      await removeHighlight(activeHighlightId);
    }
    setActiveHighlightId(null);
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
          const start = Math.max(0, idx - 40);
          const end = Math.min(text.length, idx + q.length + 40);
          let excerpt = item.document.body.textContent?.substring(start, end) || "";
          const matchRegex = new RegExp(query, 'gi');
          excerpt = excerpt.replace(matchRegex, (match: string) => `<strong class="text-purple-400">${match}</strong>`);
          
          const cfi = item.cfiFromElement(item.document.body);
          
          results.push({ cfi, excerpt: `...${excerpt}...` });
          
          idx = text.indexOf(q, idx + q.length);
          if (results.length > 50) break;
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

  const handleToggleTTS = async () => {
    if (isReadingAloud) {
      window.speechSynthesis.cancel();
      setIsReadingAloud(false);
    } else {
      try {
        const location = (renditionRef.current as any)?.location;
        if (!location || !bookRef.current) return;
        
        // Grab the current chapter's DOM
        const iframe = viewerRef.current?.querySelector("iframe");
        let text = "";
        if (iframe?.contentDocument) {
           text = iframe.contentDocument.body.innerText;
        } else {
           const spineItem = (bookRef.current as any).spine.get(location.start.cfi);
           if (spineItem && (spineItem as any).document) {
             text = (spineItem as any).document.body.innerText;
           }
        }
        
        if (!text) {
          alert("Could not extract text for Read Aloud.");
          return;
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.onend = () => setIsReadingAloud(false);
        utteranceRef.current = utterance;
        
        window.speechSynthesis.speak(utterance);
        setIsReadingAloud(true);
      } catch (e) {
        console.error("TTS Error", e);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const bgColors = { light: "bg-white", dark: "bg-[#0f0f12]", sepia: "bg-[#f4ecd8]" };
  const isBookmarked = bookmarks.some(b => {
    if (!bookRef.current || bookRef.current.locations.length() === 0) return b.cfi === currentCfi;
    try {
      const bPct = Math.round(bookRef.current.locations.percentageFromCfi(b.cfi) * 100);
      const cPct = Math.round(progress);
      return bPct === cPct;
    } catch {
      return b.cfi === currentCfi;
    }
  });

  return (
    <div className={`fixed inset-0 ${bgColors[settings.theme]} flex flex-col`}>
      
      {/* Real-time Sync Prompt */}
      {syncPrompt && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-5">
          <span className="text-sm">Synced to a newer position on another device.</span>
          <div className="flex gap-2">
            <button onClick={() => { navigateTo(syncPrompt.cfi); setSyncPrompt(null); }} className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors cursor-pointer">Jump</button>
            <button onClick={() => setSyncPrompt(null)} className="px-3 py-1 hover:bg-white/10 rounded text-sm transition-colors cursor-pointer">Dismiss</button>
          </div>
        </div>
      )}

      {/* Floating Action Bars */}
      {selection && (
        <HighlightPopover
          x={selection.x}
          y={selection.y}
          onSave={handleSaveHighlight}
          onClose={() => setSelection(null)}
        />
      )}

      {activeHighlightId && activeHighlightPos && (
        <HighlightPopover
          x={activeHighlightPos.x}
          y={activeHighlightPos.y}
          isExisting={true}
          initialColor={highlights.find(h => h.id === activeHighlightId)?.color as HighlightColor || "yellow"}
          initialNote={highlights.find(h => h.id === activeHighlightId)?.note || ""}
          onSave={handleUpdateExistingHighlight}
          onDelete={handleDeleteHighlight}
          onClose={() => setActiveHighlightId(null)}
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
        chapter={chapter || "Unknown Chapter"}
        progress={progress}
        toc={toc}
        bookmarks={bookmarks}
        highlights={highlights as any}
        estimatedTimeRemaining={estimatedTimeRemaining}
        settings={settings}
        onSettingsChange={updateSettings}
        isBookmarked={isBookmarked}
        onNavigate={navigateTo}
        onToggleBookmark={handleToggleBookmark}
        onToggleTTS={handleToggleTTS}
        isReadingAloud={isReadingAloud}
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

      <div className={`h-1 ${settings.theme === "dark" ? "bg-zinc-900" : "bg-gray-200"}`}>
        <div
          className="h-full bg-gradient-to-r from-red-600 to-rose-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}


"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import ePub, { type Book, type Rendition } from "epubjs";
import { createClient } from "@/lib/supabase/client";
import {
  saveReaderSettings,
  type ReaderSettings,
  useReaderSettings,
} from "@/lib/reader-settings";
import {
  enqueue,
  getLocalBookmarks,
  getQueue,
  initOfflineSync,
  removeLocalBookmark,
  saveLocalBookmark,
} from "@/lib/offline-queue";
import { getBookmarks } from "@/app/actions/reader.actions";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ReaderToolbar, type NavItem, type BookmarkData } from "./reader-toolbar";
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
  const totalWordsRef = useRef<number>(0);
  
  const [showToolbar, setShowToolbar] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [distractionFree, setDistractionFree] = useState(false);
  const [currentCfi, setCurrentCfi] = useState(initialCfi || "");
  const [progress, setProgress] = useState(initialProgress);
  const [chapterProgress, setChapterProgress] = useState(0);
  const [chapter, setChapter] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [toc, setToc] = useState<NavItem[]>([]);
  const settings = useReaderSettings();
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const sessionWordsReadRef = useRef<number>(0);
  const wpmRef = useRef<number>(250); // Default average WPM

  const turnPage = useCallback((dir: "next" | "prev") => {
    if (!renditionRef.current) return;
    if (dir === "next") {
      renditionRef.current.next();
    } else {
      renditionRef.current.prev();
    }
  }, []);

  const turnPageRef = useRef(turnPage);
  useEffect(() => {
    turnPageRef.current = turnPage;
  }, [turnPage]);
  
  // Phase 1 State
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [searchResults, setSearchResults] = useState<{ cfi: string; excerpt: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { highlights, addHighlight, removeHighlight, updateHighlight } = useHighlights(bookId);

  // Keep a ref in sync so epub.js listeners (which close over mount-time values)
  // always see the latest highlights without requiring a full effect re-run.
  const highlightsRef = useRef(highlights);
  useEffect(() => { highlightsRef.current = highlights; }, [highlights]);

  // Keep a ref for currentCfi so the Realtime callback can read it without
  // re-subscribing on every page turn.
  const currentCfiRef = useRef(currentCfi);
  useEffect(() => { currentCfiRef.current = currentCfi; }, [currentCfi]);

  const [selection, setSelection] = useState<{ cfiRange: string; text: string; x: number; y: number } | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [activeHighlightPos, setActiveHighlightPos] = useState<{ x: number, y: number } | null>(null);
  
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const [dictionaryWord, setDictionaryWord] = useState<{ word: string; x: number; y: number } | null>(null);
  const [syncPrompt, setSyncPrompt] = useState<{ cfi: string; date: string } | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProgressRef = useRef<{ cfi: string; progressPercentage: number } | null>(null);
  const chapterRef = useRef(chapter);

  useEffect(() => {
    chapterRef.current = chapter;
  }, [chapter]);
  
  // We still need the Supabase client for Realtime subscriptions (client-only)
  const supabase = useMemo(() => createClient(), []);

  // Initialize offline sync listener once
  useEffect(() => {
    initOfflineSync();
  }, []);

  // Load Bookmarks via Server Actions
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const [remoteResult, queueResult, localResult] = await Promise.allSettled([
        getBookmarks(bookId)
          .then((data) => ({ data, available: true }))
          .catch((err) => {
            console.warn("Could not load cloud bookmarks; using local bookmarks:", err);
            return { data: [], available: false };
          }),
        getQueue(),
        getLocalBookmarks(bookId),
      ]);

      if (!mounted) return;
      const queue = queueResult.status === "fulfilled" ? queueResult.value : [];
      const local = localResult.status === "fulfilled" ? localResult.value : [];
      const cloud = remoteResult.status === "fulfilled"
        ? remoteResult.value
        : { data: [], available: false };

      const pendingAdds = new Set<string>();
      const pendingDeletes = new Set<string>();
      for (const entry of queue) {
        const action = entry.action;
        if (action.type === "addBookmark" && action.args.bookId === bookId && action.args.id) {
          pendingAdds.add(action.args.id);
        } else if (
          action.type === "removeBookmark" &&
          (!action.args.bookId || action.args.bookId === bookId)
        ) {
          pendingDeletes.add(action.args.id);
        }
      }

      const merged = new Map<string, BookmarkData>(
        (cloud.available ? cloud.data : []).map((item) => [item.id, item]),
      );
      for (const item of local) {
        if (!cloud.available || pendingAdds.has(item.id)) {
          merged.set(item.id, {
            id: item.id,
            cfi: item.cfi,
            label: item.label,
            created_at: item.createdAt,
          });
        }
      }
      for (const id of pendingDeletes) merged.delete(id);

      setBookmarks(
        [...merged.values()].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      );
    }

    void loadData();
    return () => {
      mounted = false;
    };
  }, [bookId]);

  // Real-time Sync Subscription (must stay client-side)
  // Keys only on bookId — reads currentCfi from currentCfiRef to avoid
  // tearing down the channel on every page turn.
  useEffect(() => {
    const channel = supabase
      .channel(`sync_${bookId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_books", filter: `book_id=eq.${bookId}` },
        (payload: { new: Record<string, unknown> }) => {
          const newData = payload.new as { current_cfi?: string; last_read_at?: string };
          if (newData.current_cfi && newData.current_cfi !== currentCfiRef.current && newData.last_read_at) {
            const timeDiff = new Date().getTime() - new Date(newData.last_read_at).getTime();
            if (timeDiff < 10000) {
              setSyncPrompt({ cfi: newData.current_cfi, date: newData.last_read_at });
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookId, supabase]);

  // Apply settings to rendition
  const applySettings = useCallback((rendition: Rendition, s: ReaderSettings) => {
    const themes = {
      light: { 
        body: { background: "#fbfaf6", color: "#252722", padding: "2rem 5% !important", "overflow-x": "hidden !important" },
        img: { "max-width": "100% !important", height: "auto !important" },
        svg: { "max-width": "100% !important", height: "auto !important" }
      },
      dark: { 
        body: { background: "#171916", color: "#e8e8e1", padding: "2rem 5% !important", "overflow-x": "hidden !important" },
        img: { "max-width": "100% !important", height: "auto !important" },
        svg: { "max-width": "100% !important", height: "auto !important" }
      },
      oled: {
        body: { background: "#000000", color: "#ededed", padding: "2rem 5% !important", "overflow-x": "hidden !important" },
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
      "sans-serif": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
      dyslexic: "'Atkinson Hyperlegible', Arial, sans-serif",
    };

    Object.entries(themes).forEach(([name, styles]) => {
      rendition.themes.register(name, styles);
    });
    rendition.themes.select(s.theme);
    rendition.themes.fontSize(`${s.fontSize}%`);
    rendition.themes.override("font-family", fontFamilies[s.fontFamily]);
    const lineHeights = { compact: "1.4", comfortable: "1.7", relaxed: "1.95" };
    rendition.themes.override("line-height", lineHeights[s.lineSpacing]);

    // Always override background and color so dark/sepia modes work regardless of publisher CSS
    rendition.themes.override("background", themes[s.theme].body.background);
    rendition.themes.override("color", themes[s.theme].body.color);

    if (s.disablePublisherCSS) {
      rendition.themes.override("text-align", "left");
      rendition.themes.override("padding", "2rem 5%");
    } else {
      rendition.themes.override("text-align", "inherit");
      rendition.themes.override("padding", "inherit");
    }
  }, []);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    applySettings(rendition, settings);
  }, [settings, applySettings]);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    (rendition as unknown as { flow: (flow: string) => void }).flow(settings.readingMode === "paged" ? "paginated" : "scrolled-doc");
  }, [settings.readingMode]);

  // Save progress via offline queue (debounced)
  const saveProgress = useCallback((cfi: string, pct: number) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const progress = { cfi, progressPercentage: Math.min(pct, 100) };
    pendingProgressRef.current = progress;
    saveTimerRef.current = setTimeout(async () => {
      pendingProgressRef.current = null;
      await enqueue({
        type: "syncProgress",
        args: { bookId, ...progress },
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
        chapterName: chapterRef.current || null,
        wordsRead: sessionWordsReadRef.current,
      },
    });
  }, [bookId]);

  // Initialize epub.js
  useEffect(() => {
    if (!viewerRef.current) return;

    sessionStartRef.current = new Date();
    sessionWordsReadRef.current = 0;

    const book = ePub(epubUrl);
    bookRef.current = book;

    const rendition = book.renderTo(viewerRef.current, {
      width: "100%",
      height: "100%",
      flow: settings.readingMode === "paged" ? "paginated" : "scrolled-doc",
      spread: "none",
      manager: "default",
    });

    renditionRef.current = rendition;

    applySettings(rendition, settings);

    (rendition as unknown as { hooks: { content: { register: (fn: (contents: { document: Document }) => void) => void } } }).hooks.content.register((contents: { document: Document }) => {
      const style = contents.document.createElement("style");
      style.innerHTML = `
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(180, 154, 107, 0.36); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(180, 154, 107, 0.65); }
        ::selection { background: rgba(180, 154, 107, 0.3); }
        .epub-highlight { fill-opacity: 0.35 !important; mix-blend-mode: multiply; }
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

    book.loaded.metadata.then((metadata) => {
      if (metadata.title?.trim()) setBookTitle(metadata.title.trim());
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

      if (location.start && location.start.displayed) {
        const currentP = location.start.displayed.page;
        const totalP = location.start.displayed.total;
        if (totalP > 0) {
          setChapterProgress((currentP / totalP) * 100);
        }
      }

      // Re-apply highlights after relocating (read from ref to avoid stale closure)
      setTimeout(() => {
        highlightsRef.current.forEach(hl => {
          try {
            rendition.annotations.highlight(hl.cfi_range, {}, () => {}, "epub-highlight", { fill: hl.color });
          } catch { /* ignore — CFI may not be in current view */ }
        });
      }, 100);

      // Calculate words on screen for WPM estimation
      try {
        // Estimate visible words from the iframe's text content
        const iframe = viewerRef.current?.querySelector("iframe");
        const visibleText = iframe?.contentDocument?.body?.innerText || "";
        const wordCount = visibleText.split(/\s+/).filter(Boolean).length;
        sessionWordsReadRef.current += wordCount || 250; // fallback to 250

        // Update rolling WPM estimation if they've been reading for at least a minute
        const elapsedMinutes = (new Date().getTime() - sessionStartRef.current.getTime()) / 60000;
        if (elapsedMinutes > 1) {
          wpmRef.current = Math.max(100, Math.min(1000, Math.round(sessionWordsReadRef.current / elapsedMinutes)));
        }

        // Estimate remaining time in book based on progress
        const currentPct = book.locations.length() > 0 ? book.locations.percentageFromCfi(cfi) : (progress / 100);
        const remainingProgress = 1 - currentPct;
        // Use actual word count from locations if available, otherwise fall back to a rough estimate
        const estimatedTotalWords = totalWordsRef.current > 0 ? totalWordsRef.current : 80000;
        const remainingWords = estimatedTotalWords * remainingProgress;
        setEstimatedTimeRemaining(Math.round(remainingWords / wpmRef.current));
      } catch (e) {
        console.warn("Failed to calculate words", e);
      }
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
      const contents = args[1] as { window: Window };
      const range = contents.window.getSelection()?.getRangeAt(0);
      if (!range) return;
      const rect = range.getBoundingClientRect();
      const text = contents.window.getSelection()?.toString() || "";
      
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

    // Existing Highlight Click (read from ref to avoid stale closure)
    rendition.on("markClicked", ((...args: unknown[]) => {
      const cfiRange = args[0] as string;
      const contents = args[2] as { document: Document };
      const highlight = highlightsRef.current.find(h => h.cfi_range === cfiRange);
      if (highlight) {
        setActiveHighlightId(highlight.id);
        
        try {
          const range = contents.document.querySelector(`[data-epubcfi="${cfiRange}"]`);
          const rect = range ? range.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
          
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
        } catch {
          setActiveHighlightPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        }
      }
    }));

    // Iframe clicks (only toggle on pure left clicks, not selections or middle clicks)
    rendition.on("click", ((...args: unknown[]) => {
      const e = args[0] as MouseEvent | undefined;
      // Ignore right or middle clicks (button 1 or 2)
      if (e && e.button !== undefined && e.button !== 0) return;

      // Ignore if text is selected in the iframe
      const iframe = viewerRef.current?.querySelector("iframe");
      if (iframe?.contentWindow) {
        const selection = iframe.contentWindow.getSelection();
        if (selection && selection.toString().length > 0) return;
      }

      setShowToolbar(prev => !prev);
    }));

    book.ready.then(() => {
      return book.locations.generate(1600);
    }).then(() => {
      // Estimate total words from the generated locations.
      // Each location span is ~1600 characters ≈ ~267 words (avg 6 chars/word).
      const totalLocations = book.locations.length();
      totalWordsRef.current = Math.round(totalLocations * (1600 / 6));
    });

    const keyupHandler = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if (e.key === "ArrowLeft") turnPageRef.current("prev");
      if (e.key === "ArrowRight") turnPageRef.current("next");
      if (e.key === "f" || e.key === "F") {
        setDistractionFree((prev) => !prev);
      }
      if (e.key === "?") {
        setShowToolbar(true);
        setShowShortcuts(true);
      }
      if (e.key === "Escape") {
        setDistractionFree(false);
        setShowShortcuts(false);
        setShowToolbar(false);
      }
    };

    rendition.on("keyup", ((...args: unknown[]) => {
      const e = args[0] as KeyboardEvent;
      keyupHandler(e);
    }));

    document.addEventListener("keyup", keyupHandler);

    return () => {
      void logSession();
      document.removeEventListener("keyup", keyupHandler);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      const pendingProgress = pendingProgressRef.current;
      pendingProgressRef.current = null;
      if (pendingProgress) {
        void enqueue({
          type: "syncProgress",
          args: { bookId, ...pendingProgress },
        });
      }
      rendition.destroy();
      book.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Book initialization only runs when epubUrl changes; settings and progress are synchronized via dedicated handlers and refs
  }, [epubUrl]);

  const updateSettings = (newSettings: Partial<ReaderSettings>) => {
    saveReaderSettings(newSettings);
  };

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

  const goNextChapter = () => {
    if (renditionRef.current && bookRef.current && currentCfi) {
      const bookWithSpine = bookRef.current as unknown as {
        spine: {
          get: (cfi: string) => {
            next?: () => { href?: string; cfiBase?: string } | null;
          } | null;
        };
      };
      const section = bookWithSpine.spine?.get(currentCfi);
      if (section && typeof section.next === "function") {
        const nextSection = section.next();
        if (nextSection) {
          renditionRef.current.display(nextSection.href || nextSection.cfiBase);
        }
      }
    }
  };

  const goPrevChapter = () => {
    if (renditionRef.current && bookRef.current && currentCfi) {
      const bookWithSpine = bookRef.current as unknown as {
        spine: {
          get: (cfi: string) => {
            prev?: () => { href?: string; cfiBase?: string } | null;
          } | null;
        };
      };
      const section = bookWithSpine.spine?.get(currentCfi);
      if (section && typeof section.prev === "function") {
        const prevSection = section.prev();
        if (prevSection) {
          renditionRef.current.display(prevSection.href || prevSection.cfiBase);
        }
      }
    }
  };

  // ─── Actions (now via Server Actions / Offline Queue) ────────

  const handleToggleBookmark = async () => {
    // Snapshot bookmarks at the time of click to avoid stale closure
    const snapshot = bookmarks;
    const existing = snapshot.find(b => b.cfi === currentCfi);
    if (existing) {
      await handleDeleteBookmark(existing.id);
    } else {
      const optimistic: BookmarkData = {
        id: crypto.randomUUID(),
        cfi: currentCfi,
        label: chapter || "Bookmark",
        created_at: new Date().toISOString(),
      };
      setBookmarks((prev) => [optimistic, ...prev]);

      try {
        await enqueue({
          type: "addBookmark",
          args: {
            id: optimistic.id,
            bookId,
            cfi: optimistic.cfi,
            label: optimistic.label,
            createdAt: optimistic.created_at,
          },
        });
      } catch (err) {
        console.error("Failed to save bookmark:", err);
        await removeLocalBookmark(optimistic.id).catch(() => undefined);
        setBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== optimistic.id));
      }
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    const bookmark = bookmarks.find((item) => item.id === bookmarkId);
    if (!bookmark) return;

    setBookmarks((current) => current.filter((item) => item.id !== bookmarkId));

    try {
      await enqueue({
        type: "removeBookmark",
        args: { id: bookmarkId, bookId },
      });
    } catch (err) {
      console.error("Failed to delete bookmark:", err);
      await saveLocalBookmark({
        id: bookmark.id,
        bookId,
        cfi: bookmark.cfi,
        label: bookmark.label,
        createdAt: bookmark.created_at,
      }).catch(() => undefined);
      setBookmarks((current) =>
        current.some((item) => item.id === bookmarkId) ? current : [bookmark, ...current],
      );
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
    if (activeHighlightId) {
      await updateHighlight(activeHighlightId, { color, note });
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
      const q = query.trim().toLocaleLowerCase();
      if (!q) return;

      const bookWithSpine = book as unknown as {
        spine?: {
          spineItems?: Array<{
            load: (fn: unknown) => Promise<void>;
            document: Document;
            cfiFromElement: (el: Element) => string;
            cfiFromRange: (range: Range) => string;
            unload: () => void;
          }>;
        };
      };

      for (const item of bookWithSpine.spine?.spineItems || []) {
        if (results.length >= 50) break;
        await item.load(book.load.bind(book));
        const fullText = item.document.body.textContent || "";
        const text = fullText.toLocaleLowerCase();
        
        let idx = text.indexOf(q);
        while (idx !== -1 && results.length < 50) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(fullText.length, idx + q.length + 40);
          const excerpt = `${start > 0 ? "…" : ""}${fullText.slice(start, end)}${end < fullText.length ? "…" : ""}`;
          let cfi = item.cfiFromElement(item.document.body);
          const walker = item.document.createTreeWalker(item.document.body, NodeFilter.SHOW_TEXT);
          let textNode = walker.nextNode();
          let nodeStart = 0;
          while (textNode) {
            const nodeText = textNode.textContent || "";
            const nodeOffset = idx - nodeStart;
            if (nodeOffset >= 0 && nodeOffset + q.length <= nodeText.length && nodeText.slice(nodeOffset, nodeOffset + q.length).toLocaleLowerCase() === q) {
              const range = item.document.createRange();
              range.setStart(textNode, nodeOffset);
              range.setEnd(textNode, nodeOffset + q.length);
              cfi = item.cfiFromRange(range);
              break;
            }
            nodeStart += nodeText.length;
            textNode = walker.nextNode();
          }
          results.push({ cfi, excerpt });
          idx = text.indexOf(q, idx + q.length);
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
        const location = (renditionRef.current as unknown as { location?: { start?: { cfi?: string } } })?.location;
        if (!location || !bookRef.current) return;
        
        // Grab the current chapter's DOM
        const iframe = viewerRef.current?.querySelector("iframe");
        let text = "";
        if (iframe?.contentDocument) {
           text = iframe.contentDocument.body.innerText;
        } else if (location.start?.cfi) {
           const bookWithSpine = bookRef.current as unknown as { spine?: { get: (cfi: string) => { document?: Document } | null } };
           const spineItem = bookWithSpine.spine?.get(location.start.cfi);
           if (spineItem?.document) {
             text = spineItem.document.body.innerText;
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

  const bgColors = {
    light: "bg-[#f4f2ed]",
    dark: "bg-[#171916]",
    sepia: "bg-[#ede8db]",
    oled: "bg-black",
  };
  const isBookmarked = bookmarks.some((b) => b.cfi === currentCfi);

  return (
    <div className={`fixed inset-0 ${bgColors[settings.theme]} flex flex-col select-none md:select-auto`}>
      {/* Real-time Sync Prompt */}
      {syncPrompt && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-[#1b241e] text-zinc-100 border border-[#d7f36a]/40 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-5">
          <span className="text-xs font-mono">Synced to newer position on remote device.</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                navigateTo(syncPrompt.cfi);
                setSyncPrompt(null);
              }}
              className="px-3 py-1 bg-[#d7f36a] text-[#17201b] font-mono text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Jump
            </button>
            <button
              type="button"
              onClick={() => setSyncPrompt(null)}
              className="px-3 py-1 hover:bg-[#202a23] text-zinc-400 font-mono text-xs rounded-lg transition-colors cursor-pointer"
            >
              Dismiss
            </button>
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
          initialColor={
            (highlights.find((h) => h.id === activeHighlightId)?.color as HighlightColor) ||
            "yellow"
          }
          initialNote={highlights.find((h) => h.id === activeHighlightId)?.note || ""}
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

      {/* Distraction Free / Zen Floating Badge */}
      {distractionFree && (
        <aside
          aria-label="Zen mode status"
          className="fixed top-4 right-4 z-40 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#17201b]/90 backdrop-blur-md border border-[#344137] text-[11px] font-mono text-zinc-300 opacity-60 hover:opacity-100 transition-opacity"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#d7f36a]" />
          Focus view · Press F or Esc
          <button
            type="button"
            onClick={() => setDistractionFree(false)}
            className="ml-1 p-0.5 hover:text-white cursor-pointer"
            aria-label="Exit Zen mode"
          >
            ✕
          </button>
        </aside>
      )}

      {/* Desktop Quick Side Arrow Buttons */}
      <button
        type="button"
        onClick={() => turnPage("prev")}
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#17201b]/70 backdrop-blur-md border border-[#344137] text-zinc-400 hover:text-[#d7f36a] hover:bg-[#202a23] items-center justify-center opacity-25 hover:opacity-100 transition-all cursor-pointer shadow-lg hover:scale-105"
        title="Previous Page (←)"
        aria-label="Previous Page"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => turnPage("next")}
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#17201b]/70 backdrop-blur-md border border-[#344137] text-zinc-400 hover:text-[#d7f36a] hover:bg-[#202a23] items-center justify-center opacity-25 hover:opacity-100 transition-all cursor-pointer shadow-lg hover:scale-105"
        title="Next Page (→)"
        aria-label="Next Page"
      >
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Reader Floating Instrument Toolbar */}
      <ReaderToolbar
        visible={(showToolbar && !distractionFree) || showShortcuts}
        chapter={chapter || "Unknown Chapter"}
        bookTitle={bookTitle}
        progress={progress}
        chapterProgress={chapterProgress}
        toc={toc}
        bookmarks={bookmarks}
        highlights={highlights}
        estimatedTimeRemaining={estimatedTimeRemaining}
        settings={settings}
        distractionFree={distractionFree}
        onToggleDistractionFree={() => setDistractionFree(!distractionFree)}
        onSettingsChange={updateSettings}
        isBookmarked={isBookmarked}
        onNavigate={navigateTo}
        onNextChapter={goNextChapter}
        onPrevChapter={goPrevChapter}
        onToggleBookmark={handleToggleBookmark}
        onDeleteBookmark={handleDeleteBookmark}
        onToggleTTS={handleToggleTTS}
        isReadingAloud={isReadingAloud}
        onSearch={handleSearch}
        searchResults={searchResults}
        isSearching={isSearching}
        shortcutsOpen={showShortcuts}
        onOpenShortcuts={() => setShowShortcuts(true)}
        onCloseShortcuts={() => setShowShortcuts(false)}
        onClose={() => setShowToolbar(false)}
      />

      {/* Centered Physical Document Canvas */}
      <div className="reader-canvas-wrapper flex-1 overflow-hidden flex justify-center items-center w-full px-2 sm:px-6 py-2 sm:py-5">
        <div
          data-reader-theme={settings.theme}
          className="reader-book-canvas relative w-full max-w-4xl h-full flex flex-col overflow-hidden"
        >
          {/* EPUB Viewer Surface */}
          <div
            ref={viewerRef}
            onClick={handleCenterTap}
            className="w-full h-full flex-1"
          />
        </div>
      </div>

      {/* Ambient Reading Progress Bar */}
      {!distractionFree && (
        <div data-reader-theme={settings.theme} className={`h-1 ${settings.theme === "dark" || settings.theme === "oled" ? "bg-[#121a15]" : "bg-zinc-300/60"}`}>
          <div
            className="h-full bg-[#b49a6b] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}


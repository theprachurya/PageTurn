"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import ePub, { type Book, type Rendition } from "epubjs";
import { createClient } from "@/lib/supabase/client";
import {
  getReaderSettings,
  saveReaderSettings,
  type ReaderSettings,
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
import { cn } from "@/lib/utils";
import { ReaderToolbar, type NavItem, type BookmarkData } from "./reader-toolbar";
import { DictionaryPopover } from "./dictionary-popover";
import {
  HighlightPopover,
  HIGHLIGHT_COLORS,
  type HighlightColor,
} from "./highlight-popover";
import { useHighlights } from "@/lib/hooks/use-highlights";
import { appEvents } from "@/lib/app-events";
import { toast } from "@/lib/toast";

interface EpubReaderProps {
  bookId: string;
  epubUrl: string | ArrayBuffer;
  initialCfi?: string | null;
  initialProgress?: number;
}

function resolveHighlightHex(color: string): string {
  return HIGHLIGHT_COLORS[color as HighlightColor] || color || HIGHLIGHT_COLORS.yellow;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

  // Active reading session tracking (excludes hidden tab & idle > 2m)
  const sessionStartRef = useRef<Date | null>(null);
  const activeReadingMsRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const lastActivityRef = useRef<number>(0);

  const totalWordsRef = useRef<number>(0);
  const lastProgressPctRef = useRef<number | null>(null);
  const sessionWordsReadRef = useRef<number>(0);
  const wpmRef = useRef<number>(250);

  const [showToolbar, setShowToolbar] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [distractionFree, setDistractionFree] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev" | null>(null);
  const [currentCfi, setCurrentCfi] = useState(initialCfi || "");
  const [progress, setProgress] = useState(initialProgress);
  const [chapterProgress, setChapterProgress] = useState(0);
  const [chapter, setChapter] = useState("");
  const [toc, setToc] = useState<NavItem[]>([]);
  const [settings, setSettings] = useState<ReaderSettings>(getReaderSettings());
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);

  const turnPage = useCallback((dir: "next" | "prev") => {
    if (!renditionRef.current) return;
    lastActivityRef.current = Date.now();
    setFlipDirection(dir);
    if (dir === "next") {
      renditionRef.current.next();
    } else {
      renditionRef.current.prev();
    }
    setTimeout(() => {
      setFlipDirection(null);
    }, 420);
  }, []);

  const turnPageRef = useRef(turnPage);
  useEffect(() => {
    turnPageRef.current = turnPage;
  }, [turnPage]);

  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [searchResults, setSearchResults] = useState<{ cfi: string; excerpt: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  const { highlights, addHighlight, removeHighlight, updateHighlight } = useHighlights(bookId);

  const highlightsRef = useRef(highlights);
  useEffect(() => {
    highlightsRef.current = highlights;
  }, [highlights]);

  const currentCfiRef = useRef(currentCfi);
  useEffect(() => {
    currentCfiRef.current = currentCfi;
  }, [currentCfi]);

  const [selection, setSelection] = useState<{
    cfiRange: string;
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [activeHighlightPos, setActiveHighlightPos] = useState<{ x: number; y: number } | null>(
    null
  );

  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsPlayingRef = useRef(false);

  const [dictionaryWord, setDictionaryWord] = useState<{
    word: string;
    x: number;
    y: number;
  } | null>(null);
  const [syncPrompt, setSyncPrompt] = useState<{ cfi: string; date: string } | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProgressRef = useRef<{ cfi: string; progressPercentage: number } | null>(null);
  const chapterRef = useRef(chapter);

  useEffect(() => {
    chapterRef.current = chapter;
  }, [chapter]);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    initOfflineSync();
  }, []);

  // Accumulate active reading time (only when tab is visible and user interacted within last 2 mins)
  const accumulateReadingTime = useCallback(() => {
    const now = Date.now();
    const isVisible = typeof document !== "undefined" && document.visibilityState === "visible";
    const lastActivity = lastActivityRef.current || now;
    const lastTick = lastTickRef.current || now;
    const isIdle = now - lastActivity > 120_000;
    if (isVisible && !isIdle) {
      activeReadingMsRef.current += Math.max(0, now - lastTick);
    }
    lastTickRef.current = now;
  }, []);

  // Load Bookmarks via Server Actions + Local Queue Merge
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
      const cloud =
        remoteResult.status === "fulfilled"
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
        (cloud.available ? cloud.data : []).map((item) => [item.id, item])
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
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    }

    void loadData();
    return () => {
      mounted = false;
    };
  }, [bookId]);

  // Real-time Sync Subscription
  useEffect(() => {
    const channel = supabase
      .channel(`sync_${bookId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_books",
          filter: `book_id=eq.${bookId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const newData = payload.new as { current_cfi?: string; last_read_at?: string };
          if (
            newData.current_cfi &&
            newData.current_cfi !== currentCfiRef.current &&
            newData.last_read_at
          ) {
            const timeDiff = new Date().getTime() - new Date(newData.last_read_at).getTime();
            if (timeDiff < 10000) {
              setSyncPrompt({ cfi: newData.current_cfi, date: newData.last_read_at });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookId, supabase]);

  // Apply settings to rendition
  const applySettings = useCallback((rendition: Rendition, s: ReaderSettings) => {
    const themes = {
      light: {
        body: {
          background: "#ffffff",
          color: "#18181b",
          padding: "2rem 5% !important",
          "overflow-x": "hidden !important",
        },
        img: { "max-width": "100% !important", height: "auto !important" },
        svg: { "max-width": "100% !important", height: "auto !important" },
      },
      dark: {
        body: {
          background: "#0f0f12",
          color: "#f4f4f5",
          padding: "2rem 5% !important",
          "overflow-x": "hidden !important",
        },
        img: { "max-width": "100% !important", height: "auto !important" },
        svg: { "max-width": "100% !important", height: "auto !important" },
      },
      sepia: {
        body: {
          background: "#f4ecd8",
          color: "#5b4636",
          padding: "2rem 5% !important",
          "overflow-x": "hidden !important",
        },
        img: { "max-width": "100% !important", height: "auto !important" },
        svg: { "max-width": "100% !important", height: "auto !important" },
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

    rendition.themes.override("background", themes[s.theme].body.background);
    rendition.themes.override("color", themes[s.theme].body.color);

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
  const saveProgress = useCallback(
    (cfi: string, pct: number) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const progressPayload = {
        cfi,
        progressPercentage: Math.min(pct, 100),
        clientUpdatedAt: new Date().toISOString(),
      };
      pendingProgressRef.current = progressPayload;
      saveTimerRef.current = setTimeout(async () => {
        pendingProgressRef.current = null;
        await enqueue({
          type: "syncProgress",
          args: { bookId, ...progressPayload },
        });
      }, 3000);
    },
    [bookId]
  );

  // Flush active reading session (>= 30s active time)
  const logSession = useCallback(async () => {
    accumulateReadingTime();
    const durationMs = activeReadingMsRef.current;
    const startTimeIso = (sessionStartRef.current ?? new Date()).toISOString();

    // Reset immediately so visibilitychange + unmount never double-log the same session
    activeReadingMsRef.current = 0;
    const wordsReadSnapshot = sessionWordsReadRef.current;
    sessionWordsReadRef.current = 0;
    sessionStartRef.current = new Date();
    lastTickRef.current = Date.now();

    if (durationMs < 30000) return;

    const endTime = new Date();
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    await enqueue({
      type: "logSession",
      args: {
        bookId,
        startTime: startTimeIso,
        endTime: endTime.toISOString(),
        durationMinutes,
        chapterName: chapterRef.current || null,
        wordsRead: wordsReadSnapshot,
      },
    });
  }, [accumulateReadingTime, bookId]);

  // Initialize epub.js
  useEffect(() => {
    if (!viewerRef.current) return;

    sessionStartRef.current = new Date();
    activeReadingMsRef.current = 0;
    lastTickRef.current = Date.now();
    lastActivityRef.current = Date.now();
    sessionWordsReadRef.current = 0;
    lastProgressPctRef.current = null;

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

    (
      rendition as unknown as {
        hooks: { content: { register: (fn: (contents: { document: Document }) => void) => void } };
      }
    ).hooks.content.register((contents: { document: Document }) => {
      const style = contents.document.createElement("style");
      style.innerHTML = `
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(215, 243, 106, 0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(215, 243, 106, 0.6); }
        ::selection { background: rgba(215, 243, 106, 0.35); }
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

    book.loaded.navigation.then((nav) => {
      if (nav && nav.toc) {
        setToc(nav.toc as unknown as NavItem[]);
      }
    });

    rendition.on("relocated", (...args: unknown[]) => {
      accumulateReadingTime();
      lastActivityRef.current = Date.now();

      const location = args[0] as {
        start: { cfi: string; displayed: { page: number; total: number } };
        atEnd: boolean;
      };
      const cfi = location.start.cfi;
      setCurrentCfi(cfi);
      setSelection(null);
      setDictionaryWord(null);

      let currentFraction = progress / 100;
      if (book.locations.length() > 0) {
        currentFraction = book.locations.percentageFromCfi(cfi);
        const pct = currentFraction * 100;
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

      // Re-apply highlights with proper hex colors
      setTimeout(() => {
        highlightsRef.current.forEach((hl) => {
          try {
            rendition.annotations.highlight(
              hl.cfi_range,
              {},
              () => {},
              "epub-highlight",
              { fill: resolveHighlightHex(hl.color) }
            );
          } catch {
            /* ignore — CFI may not be in current view */
          }
        });
      }, 100);

      // Accurate delta-based word count estimation (avoids re-counting whole chapter on scroll)
      try {
        const estimatedTotalWords = totalWordsRef.current > 0 ? totalWordsRef.current : 80000;
        if (lastProgressPctRef.current !== null) {
          const deltaFraction = currentFraction - lastProgressPctRef.current;
          // Only count forward reading progress increments (up to 5% per relocation event)
          if (deltaFraction > 0 && deltaFraction < 0.05) {
            sessionWordsReadRef.current += Math.round(deltaFraction * estimatedTotalWords);
          }
        }
        lastProgressPctRef.current = currentFraction;

        const elapsedMinutes = activeReadingMsRef.current / 60000;
        if (elapsedMinutes >= 1 && sessionWordsReadRef.current > 50) {
          wpmRef.current = Math.max(
            100,
            Math.min(1000, Math.round(sessionWordsReadRef.current / elapsedMinutes))
          );
        }

        const remainingWords = estimatedTotalWords * Math.max(0, 1 - currentFraction);
        setEstimatedTimeRemaining(Math.round(remainingWords / wpmRef.current));
      } catch (e) {
        console.warn("Failed to calculate words", e);
      }
    });

    rendition.on("rendered", (...args: unknown[]) => {
      const section = args[0] as { href: string };
      const currentToc = book.navigation?.toc;
      if (currentToc) {
        const match = currentToc.find((item: { href: string }) =>
          section.href.includes(item.href)
        );
        if (match) setChapter((match as { label: string }).label?.trim() || "");
      }
    });

    // Text Selection -> Highlight Popover + Single-Word Dictionary Lookup
    rendition.on("selected", (...args: unknown[]) => {
      lastActivityRef.current = Date.now();
      const cfiRange = args[0] as string;
      const contents = args[1] as { window: Window };
      const sel = contents.window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const text = sel.toString().trim();
      if (!text) return;

      const iframe = viewerRef.current?.querySelector("iframe");
      const iframeRect = iframe?.getBoundingClientRect();
      const x = (iframeRect ? iframeRect.left : 0) + rect.left + rect.width / 2;
      const y = (iframeRect ? iframeRect.top : 0) + rect.top;

      setSelection({ cfiRange, text, x, y });
      setActiveHighlightId(null);

      // If selection is a single dictionary word (letters/hyphens), also show DictionaryPopover
      const cleanedWord = text.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, "");
      if (cleanedWord && /^[a-zA-Z-]{2,30}$/.test(cleanedWord) && !/\s/.test(text)) {
        setDictionaryWord({ word: cleanedWord, x, y: y + rect.height });
      } else {
        setDictionaryWord(null);
      }
    });

    // Existing Highlight Click
    rendition.on("markClicked", (...args: unknown[]) => {
      const cfiRange = args[0] as string;
      const contents = args[2] as { document: Document };
      const highlight = highlightsRef.current.find((h) => h.cfi_range === cfiRange);
      if (highlight) {
        setActiveHighlightId(highlight.id);
        setDictionaryWord(null);

        try {
          const range = contents.document.querySelector(`[data-epubcfi="${cfiRange}"]`);
          const rect = range
            ? range.getBoundingClientRect()
            : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };

          const iframe = viewerRef.current?.querySelector("iframe");
          if (iframe && range) {
            const iframeRect = iframe.getBoundingClientRect();
            setActiveHighlightPos({
              x: iframeRect.left + rect.left + rect.width / 2,
              y: iframeRect.top + rect.top,
            });
          } else {
            setActiveHighlightPos({ x: rect.left, y: rect.top });
          }
        } catch {
          setActiveHighlightPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        }
      }
    });

    rendition.on("click", (...args: unknown[]) => {
      const e = args[0] as MouseEvent | undefined;
      if (e && e.button !== undefined && e.button !== 0) return;

      const iframe = viewerRef.current?.querySelector("iframe");
      if (iframe?.contentWindow) {
        const sel = iframe.contentWindow.getSelection();
        if (sel && sel.toString().length > 0) return;
      }

      setShowToolbar((prev) => !prev);
    });

    book.ready
      .then(() => book.locations.generate(1600))
      .then(() => {
        const totalLocations = book.locations.length();
        totalWordsRef.current = Math.round(totalLocations * (1600 / 6));
      });

    const isInputFocused = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = (target?.tagName || document.activeElement?.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select" || Boolean(target?.isContentEditable);
    };

    const keydownHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        appEvents.openCommandPalette();
      }
    };

    const keyupHandler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isInputFocused(e)) return;

      if (e.key === "ArrowLeft") turnPageRef.current("prev");
      if (e.key === "ArrowRight") turnPageRef.current("next");
      if (e.key === "f" || e.key === "F") {
        setDistractionFree((prev) => !prev);
      }
      if (e.key === "Escape") {
        setDistractionFree(false);
        setShowToolbar(false);
        setShowSidebar(false);
        setDictionaryWord(null);
        setSelection(null);
      }
    };

    rendition.on("keydown", (...args: unknown[]) => {
      keydownHandler(args[0] as KeyboardEvent);
    });

    rendition.on("keyup", (...args: unknown[]) => {
      keyupHandler(args[0] as KeyboardEvent);
    });

    document.addEventListener("keyup", keyupHandler);

    const handleVisibilityChange = () => {
      accumulateReadingTime();
      if (document.visibilityState === "hidden") {
        void logSession();
      }
    };

    const handlePageHide = () => {
      void logSession();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      void logSession();
      document.removeEventListener("keyup", keyupHandler);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Book initialization only runs when epubUrl changes
  }, [epubUrl]);

  const updateSettings = useCallback(
    (newSettings: Partial<ReaderSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...newSettings };
        saveReaderSettings(newSettings);
        if (renditionRef.current) {
          applySettings(renditionRef.current, updated);
        }
        return updated;
      });
    },
    [applySettings]
  );

  const navigateTo = useCallback((href: string) => {
    renditionRef.current?.display(href);
    setSelection(null);
    setDictionaryWord(null);
  }, []);

  const handleCenterTap = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
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

  const handleDeleteBookmark = useCallback(
    async (bookmarkId: string) => {
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
          current.some((item) => item.id === bookmarkId) ? current : [bookmark, ...current]
        );
      }
    },
    [bookId, bookmarks]
  );

  const handleToggleBookmark = useCallback(async () => {
    const snapshot = bookmarks;
    const existing = snapshot.find((b) => b.cfi === currentCfi);
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
  }, [ bookId, bookmarks, chapter, currentCfi, handleDeleteBookmark ]);

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
        try {
          renditionRef.current.annotations.highlight(
            selection.cfiRange,
            {},
            () => {},
            "epub-highlight",
            { fill: resolveHighlightHex(color) }
          );
        } catch (e) {
          console.error("Failed to apply highlight in rendition", e);
        }
      }
    } catch (err) {
      console.error("Highlight save failed", err);
    }

    setSelection(null);
    setDictionaryWord(null);
    if (viewerRef.current) {
      const iframe = viewerRef.current.querySelector("iframe");
      if (iframe?.contentWindow) {
        iframe.contentWindow.getSelection()?.removeAllRanges();
      }
    }
  };

  const handleUpdateExistingHighlight = async (color: HighlightColor, note?: string) => {
    if (activeHighlightId) {
      const existing = highlights.find((h) => h.id === activeHighlightId);
      await updateHighlight(activeHighlightId, { color, note });
      if (existing && renditionRef.current) {
        try {
          renditionRef.current.annotations.remove(existing.cfi_range, "highlight");
          renditionRef.current.annotations.highlight(
            existing.cfi_range,
            {},
            () => {},
            "epub-highlight",
            { fill: resolveHighlightHex(color) }
          );
        } catch {
          /* ignore */
        }
      }
    }
    setActiveHighlightId(null);
  };

  const handleDeleteHighlight = async () => {
    if (activeHighlightId) {
      const highlight = highlights.find((h) => h.id === activeHighlightId);
      if (highlight && renditionRef.current) {
        renditionRef.current.annotations.remove(highlight.cfi_range, "highlight");
      }
      await removeHighlight(activeHighlightId);
    }
    setActiveHighlightId(null);
  };

  const handleSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!bookRef.current || !trimmed) return;

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setIsSearching(true);
    setSearchResults([]);

    try {
      const book = bookRef.current;
      const results: { cfi: string; excerpt: string }[] = [];
      const safeRegex = new RegExp(escapeRegExp(trimmed), "gi");

      const bookWithSpine = book as unknown as {
        spine?: {
          spineItems?: Array<{
            load: (fn: unknown) => Promise<void>;
            find?: (q: string) => Array<{ cfi: string; excerpt: string }>;
            document?: Document;
            cfiFromElement: (el: Element) => string;
            unload: () => void;
          }>;
        };
      };

      for (const item of bookWithSpine.spine?.spineItems || []) {
        if (controller.signal.aborted) return;

        try {
          await item.load(book.load.bind(book));

          if (typeof item.find === "function") {
            const matches = item.find(trimmed);
            for (const m of matches) {
              const escapedExcerpt = escapeHtml(m.excerpt || "").replace(
                safeRegex,
                (match: string) => `<strong class="text-[#d7f36a]">${match}</strong>`
              );
              results.push({ cfi: m.cfi, excerpt: `...${escapedExcerpt}...` });
              if (results.length >= 50) break;
            }
          } else if (item.document?.body) {
            const rawText = item.document.body.textContent || "";
            const lowerText = rawText.toLowerCase();
            const q = trimmed.toLowerCase();
            let idx = lowerText.indexOf(q);
            while (idx !== -1) {
              const start = Math.max(0, idx - 40);
              const end = Math.min(rawText.length, idx + q.length + 40);
              const rawExcerpt = rawText.substring(start, end);
              const escapedExcerpt = escapeHtml(rawExcerpt).replace(
                safeRegex,
                (match: string) => `<strong class="text-[#d7f36a]">${match}</strong>`
              );
              const cfi = item.cfiFromElement(item.document.body);
              results.push({ cfi, excerpt: `...${escapedExcerpt}...` });
              idx = lowerText.indexOf(q, idx + q.length);
              if (results.length >= 50) break;
            }
          }
        } finally {
          item.unload();
        }

        if (results.length >= 50) break;
        await new Promise((r) => setTimeout(r, 0));
      }

      if (!controller.signal.aborted) {
        setSearchResults(results);
      }
    } catch (e) {
      console.error("Search error", e);
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false);
      }
    }
  };

  // Chunked Web Speech Synthesis (avoids Chromium 15s cutoff)
  const stopTTS = useCallback(() => {
    ttsPlayingRef.current = false;
    utteranceRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsReadingAloud(false);
  }, []);

  const handleToggleTTS = useCallback(async () => {
    if (isReadingAloud) {
      stopTTS();
      return;
    }

    try {
      const location = (
        renditionRef.current as unknown as { location?: { start?: { cfi?: string } } }
      )?.location;
      if (!location || !bookRef.current) return;

      const iframe = viewerRef.current?.querySelector("iframe");
      let text = "";
      if (iframe?.contentDocument) {
        text = iframe.contentDocument.body.innerText;
      } else if (location.start?.cfi) {
        const bookWithSpine = bookRef.current as unknown as {
          spine?: { get: (cfi: string) => { document?: Document } | null };
        };
        const spineItem = bookWithSpine.spine?.get(location.start.cfi);
        if (spineItem?.document) {
          text = spineItem.document.body.innerText;
        }
      }

      const chunks = text
        .split(/(?<=[.!?])\s+|\n+/g)
        .map((s) => s.trim())
        .filter(Boolean);

      if (chunks.length === 0) {
        toast.error("Could not extract text for Read Aloud.");
        return;
      }

      ttsPlayingRef.current = true;
      setIsReadingAloud(true);

      let index = 0;
      const speakNext = () => {
        if (!ttsPlayingRef.current || index >= chunks.length) {
          stopTTS();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        utterance.rate = 1.0;
        utterance.onend = () => {
          if (!ttsPlayingRef.current) return;
          index += 1;
          speakNext();
        };
        utterance.onerror = (ev) => {
          if (ev.error !== "canceled" && ev.error !== "interrupted") {
            console.warn("TTS error:", ev.error);
          }
          stopTTS();
        };
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      };

      speakNext();
    } catch (e) {
      console.error("TTS Error", e);
      stopTTS();
    }
  }, [isReadingAloud, stopTTS]);

  useEffect(() => {
    return () => {
      stopTTS();
      searchAbortRef.current?.abort();
    };
  }, [stopTTS]);

  // Register reader commands with AppShell / CommandPalette
  useEffect(() => {
    appEvents.setReaderHandlers({
      onToggleTheme: (theme) => updateSettings({ theme }),
      onToggleTTS: () => void handleToggleTTS(),
      onToggleBookmark: () => void handleToggleBookmark(),
      onToggleSidebar: () => {
        setShowToolbar(true);
        setDistractionFree(false);
        setShowSidebar((prev) => !prev);
      },
      onToggleDistractionFree: () => setDistractionFree((prev) => !prev),
      toc,
      onNavigateChapter: navigateTo,
    });
    return () => {
      appEvents.setReaderHandlers(null);
    };
  }, [handleToggleBookmark, handleToggleTTS, navigateTo, toc, updateSettings]);

  const bgColors = {
    light: "bg-[#f5f2eb]",
    dark: "bg-[#101317]",
    sepia: "bg-[#ede8db]",
  };
  const isBookmarked = bookmarks.some((b) => b.cfi === currentCfi);

  return (
    <div
      className={`fixed inset-0 ${bgColors[settings.theme]} flex flex-col select-none md:select-auto`}
    >
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
          <span className="w-1.5 h-1.5 rounded-full bg-[#d7f36a] animate-pulse" />
          Zen Mode (Press F or Esc)
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
        visible={showToolbar && !distractionFree}
        sidebarOpen={showSidebar}
        onSidebarOpenChange={setShowSidebar}
        chapter={chapter || "Unknown Chapter"}
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
        onClose={() => setShowToolbar(false)}
      />

      {/* Centered Physical Document Canvas */}
      <div className="reader-canvas-wrapper flex-1 overflow-hidden flex justify-center items-center w-full px-2 sm:px-6 py-2 sm:py-5">
        <div
          data-reader-theme={settings.theme}
          className={cn(
            "reader-book-canvas relative w-full max-w-4xl h-full flex flex-col overflow-hidden",
            flipDirection === "next" && "page-turn-anim-next",
            flipDirection === "prev" && "page-turn-anim-prev"
          )}
        >
          {/* Realistic Paper Page Deckle Edge */}
          <div className="reader-page-edge pointer-events-none" />

          {/* 3D Paper Curl Shadow Sweep on Turn */}
          {flipDirection === "next" && <div className="paper-shadow-sweep-next" />}
          {flipDirection === "prev" && <div className="paper-shadow-sweep-prev" />}

          {/* EPUB Viewer Surface */}
          <div ref={viewerRef} onClick={handleCenterTap} className="w-full h-full flex-1" />
        </div>
      </div>

      {/* Ambient Reading Progress Bar */}
      {!distractionFree && (
        <div className={`h-1 ${settings.theme === "dark" ? "bg-[#121a15]" : "bg-zinc-300/60"}`}>
          <div
            className="h-full bg-gradient-to-r from-[#d7f36a] to-[#bfdc51] shadow-[0_0_8px_rgba(215,243,106,0.35)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

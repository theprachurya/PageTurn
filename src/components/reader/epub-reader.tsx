"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ePub, { type Book, type Rendition } from "epubjs";
import { createClient } from "@/lib/supabase/client";
import {
  getReaderSettings,
  saveReaderSettings,
  type ReaderSettings,
} from "@/lib/reader-settings";
import { ReaderToolbar } from "./reader-toolbar";

interface EpubReaderProps {
  bookId: string;
  epubUrl: string;
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
  const [settings, setSettings] = useState<ReaderSettings>(getReaderSettings());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current && typeof window !== "undefined") {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current!;

  // Theme definitions
  const themes = {
    light: {
      body: { background: "#ffffff", color: "#1a1a2e" },
    },
    dark: {
      body: { background: "#1a1a2e", color: "#e2e8f0" },
    },
    sepia: {
      body: { background: "#f4ecd8", color: "#5b4636" },
    },
  };

  const fontFamilies = {
    serif: "Georgia, 'Times New Roman', serif",
    "sans-serif": "'Geist', system-ui, sans-serif",
    dyslexic: "OpenDyslexic, 'Comic Sans MS', sans-serif",
  };

  // Apply settings to rendition
  const applySettings = useCallback(
    (rendition: Rendition, s: ReaderSettings) => {
      // Register and select theme
      Object.entries(themes).forEach(([name, styles]) => {
        rendition.themes.register(name, styles);
      });
      rendition.themes.select(s.theme);

      // Font size
      rendition.themes.fontSize(`${s.fontSize}%`);

      // Font family
      rendition.themes.override("font-family", fontFamilies[s.fontFamily]);

      // Disable publisher CSS
      if (s.disablePublisherCSS) {
        rendition.themes.override("font-family", fontFamilies[s.fontFamily]);
        rendition.themes.override("line-height", "1.6");
        rendition.themes.override("text-align", "left");
      }
    },
    []
  );

  // Save progress to database (debounced)
  const saveProgress = useCallback(
    (cfi: string, pct: number) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
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
    },
    [bookId]
  );

  // Log reading session on unmount
  const logSession = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const endTime = new Date();
    const durationMs = endTime.getTime() - sessionStartRef.current.getTime();
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    // Only log if they read for at least 30 seconds
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
  }, [bookId, chapter]);

  // Initialize epub.js
  useEffect(() => {
    if (!viewerRef.current) return;

    const book = ePub(epubUrl);
    bookRef.current = book;

    const rendition = book.renderTo(viewerRef.current, {
      width: "100%",
      height: "100%",
      flow: "paginated",
      spread: "none",
    });

    renditionRef.current = rendition;

    // Apply saved settings
    applySettings(rendition, settings);

    // Display from saved CFI or beginning
    if (initialCfi) {
      rendition.display(initialCfi);
    } else {
      rendition.display();
    }

    // Listen for location changes
    rendition.on("relocated", ((...args: unknown[]) => {
      const location = args[0] as { start: { cfi: string; displayed: { page: number; total: number } }; atEnd: boolean };
      const cfi = location.start.cfi;
      setCurrentCfi(cfi);

      // Calculate progress
      if (book.locations.length() > 0) {
        const pct = book.locations.percentageFromCfi(cfi) * 100;
        setProgress(pct);
        saveProgress(cfi, pct);
      }
    }));

    // Extract chapter from TOC
    rendition.on("rendered", ((...args: unknown[]) => {
      const section = args[0] as { href: string };
      const toc = book.navigation?.toc;
      if (toc) {
        const match = toc.find(
          (item: { href: string }) =>
            section.href.includes(item.href)
        );
        if (match) setChapter((match as { label: string }).label?.trim() || "");
      }
    }));

    // Generate locations for progress tracking
    book.ready.then(() => {
      return book.locations.generate(1600);
    });

    // Keyboard navigation
    rendition.on("keyup", ((...args: unknown[]) => {
      const e = args[0] as KeyboardEvent;
      if (e.key === "ArrowLeft") rendition.prev();
      if (e.key === "ArrowRight") rendition.next();
    }));

    document.addEventListener("keyup", (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") rendition.prev();
      if (e.key === "ArrowRight") rendition.next();
    });

    return () => {
      logSession();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      rendition.destroy();
      book.destroy();
    };
  }, [epubUrl]);

  // Handle settings changes
  const updateSettings = (newSettings: Partial<ReaderSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveReaderSettings(newSettings);

    if (renditionRef.current) {
      applySettings(renditionRef.current, updated);
    }
  };

  const goNext = () => renditionRef.current?.next();
  const goPrev = () => renditionRef.current?.prev();

  const handleCenterTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.3) {
      goPrev();
    } else if (x > width * 0.7) {
      goNext();
    } else {
      setShowToolbar(!showToolbar);
    }
  };

  // Background color based on theme
  const bgColors = {
    light: "bg-white",
    dark: "bg-[#1a1a2e]",
    sepia: "bg-[#f4ecd8]",
  };

  return (
    <div className={`fixed inset-0 ${bgColors[settings.theme]} flex flex-col`}>
      {/* Toolbar */}
      <ReaderToolbar
        visible={showToolbar}
        settings={settings}
        onSettingsChange={updateSettings}
        chapter={chapter}
        progress={progress}
        onClose={() => setShowToolbar(false)}
      />

      {/* Reader area */}
      <div
        ref={viewerRef}
        onClick={handleCenterTap}
        className="flex-1 overflow-hidden cursor-pointer"
      />

      {/* Progress bar at bottom */}
      <div className={`h-1 ${settings.theme === "dark" ? "bg-slate-700" : "bg-gray-200"}`}>
        <div
          className="h-full bg-gradient-to-r from-purple-400 to-lavender-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

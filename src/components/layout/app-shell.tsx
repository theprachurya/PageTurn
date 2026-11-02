"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { TopNav } from "./top-nav";
import { BottomNav } from "./bottom-nav";
import { CommandPalette } from "@/components/ui/command-palette";
import { ToastContainer } from "@/components/ui/toast-container";
import { appEvents, type ReaderCommandHandlers } from "@/lib/app-events";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const BookUploader = dynamic(
  () => import("@/components/upload/book-uploader").then((module) => module.BookUploader),
  { ssr: false }
);

interface BookListItem {
  book_id: string;
  title: string;
  author?: string | null;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable || Boolean(target.closest('[contenteditable="true"]'));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isReader = pathname?.startsWith("/read/");

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [booksList, setBooksList] = useState<BookListItem[]>([]);
  const [readerActions, setReaderActions] = useState<ReaderCommandHandlers | null>(null);
  const booksLoadedRef = useRef(false);
  const gChordRef = useRef(false);
  const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBooksForPalette = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_books")
        .select("book_id, books (title, author)")
        .eq("user_id", user.id)
        .order("last_read_at", { ascending: false });

      if (data) {
        const list: BookListItem[] = [];
        (
          data as Array<{
            book_id: string;
            books: { title?: string; author?: string } | null;
          }>
        ).forEach((row) => {
          const b = row.books;
          if (b?.title) {
            list.push({
              book_id: row.book_id,
              title: b.title,
              author: b.author || null,
            });
          }
        });
        setBooksList(list);
        booksLoadedRef.current = true;
      }
    } catch {
      // Ignore background fetch error
    }
  }, []);

  useEffect(() => {
    if (isCommandPaletteOpen && !booksLoadedRef.current) {
      void fetchBooksForPalette();
    }
  }, [isCommandPaletteOpen, fetchBooksForPalette]);

  // Global keyboard shortcuts (Cmd/Ctrl+K, G+S/L/T/H/,, U, and reader T/B/M)
  useEffect(() => {
    const clearChord = () => {
      gChordRef.current = false;
      if (gTimerRef.current) {
        clearTimeout(gTimerRef.current);
        gTimerRef.current = null;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        clearChord();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (
        isCommandPaletteOpen ||
        isUploaderOpen ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        isEditableElement(e.target)
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      if (gChordRef.current) {
        clearChord();
        const routes: Record<string, string> = {
          s: "/shelf",
          l: "/library",
          t: "/stats",
          h: "/history",
          ",": "/settings",
        };
        if (routes[key]) {
          e.preventDefault();
          router.push(routes[key]);
        }
        return;
      }

      if (key === "g") {
        gChordRef.current = true;
        gTimerRef.current = setTimeout(clearChord, 1000);
        return;
      }

      if (key === "u" && !isReader) {
        e.preventDefault();
        setIsUploaderOpen(true);
        return;
      }

      if (isReader && readerActions) {
        if (key === "t") {
          e.preventDefault();
          readerActions.onToggleTTS();
        } else if (key === "b") {
          e.preventDefault();
          readerActions.onToggleBookmark();
        } else if (key === "m") {
          e.preventDefault();
          readerActions.onToggleSidebar();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearChord();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCommandPaletteOpen, isUploaderOpen, isReader, readerActions, router]);

  // Event bus listeners
  useEffect(() => {
    const unsubCommand = appEvents.onOpenCommandPalette(() => {
      setIsCommandPaletteOpen((prev) => !prev);
    });
    const unsubUpload = appEvents.onOpenUploader(() => {
      setIsUploaderOpen(true);
    });
    const unsubReader = appEvents.onReaderHandlersChange((handlers) => {
      setReaderActions(handlers);
    });

    return () => {
      unsubCommand();
      unsubUpload();
      unsubReader();
    };
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      isReader ||
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    event.currentTarget.style.setProperty("--pointer-x", `${event.clientX}px`);
    event.currentTarget.style.setProperty("--pointer-y", `${event.clientY}px`);
    event.currentTarget.style.setProperty("--pointer-glow-opacity", "1");
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--pointer-glow-opacity", "0");
  };

  return (
    <div
      className="app-shell min-h-screen bg-[#101317] text-zinc-50 selection:bg-gold-500/25 selection:text-gold-200 antialiased"
      data-reader={isReader ? "true" : undefined}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {!isReader && <div className="app-orbit" aria-hidden="true" />}
      {!isReader && <TopNav />}
      {!isReader && <BottomNav />}

      <main className={cn("min-h-screen relative z-10", !isReader && "pt-16 pb-20 md:pb-8")}>
        {children}
      </main>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        readerActions={readerActions ?? undefined}
        books={booksList}
        onOpenUpload={() => setIsUploaderOpen(true)}
      />

      {/* Global Book Uploader triggered by TopNav / Command Palette */}
      {isUploaderOpen && (
        <BookUploader
          isOpenExternally={isUploaderOpen}
          onCloseExternal={() => {
            setIsUploaderOpen(false);
            void fetchBooksForPalette();
          }}
          onUploadComplete={() => {
            setIsUploaderOpen(false);
            void fetchBooksForPalette();
          }}
        />
      )}

      {/* Global Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

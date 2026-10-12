"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { TopNav } from "./top-nav";
import { BottomNav } from "./bottom-nav";
import { CommandPalette } from "@/components/ui/command-palette";
import { ToastContainer } from "@/components/ui/toast-container";
import { BookUploader } from "@/components/upload/book-uploader";
import { appEvents } from "@/lib/app-events";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface BookListItem {
  book_id: string;
  title: string;
  author?: string | null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReader = pathname?.startsWith("/read/");

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [booksList, setBooksList] = useState<BookListItem[]>([]);

  // Fetch book list for command palette
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
      }
    } catch {
      // Ignore background fetch error
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      if (!ignore) {
        await fetchBooksForPalette();
      }
    }
    void init();
    return () => {
      ignore = true;
    };
  }, [fetchBooksForPalette]);

  // Global Cmd+K / Ctrl+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Event bus listeners
  useEffect(() => {
    const unsubCommand = appEvents.onOpenCommandPalette(() => {
      setIsCommandPaletteOpen(true);
    });
    const unsubUpload = appEvents.onOpenUploader(() => {
      setIsUploaderOpen(true);
    });

    return () => {
      unsubCommand();
      unsubUpload();
    };
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isReader || event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
        books={booksList}
        onOpenUpload={() => setIsUploaderOpen(true)}
      />

      {/* Global Book Uploader triggered by TopNav / Command Palette */}
      {isUploaderOpen && (
        <BookUploader
          isOpenExternally={isUploaderOpen}
          onCloseExternal={() => {
            setIsUploaderOpen(false);
            fetchBooksForPalette();
          }}
          onUploadComplete={() => {
            setIsUploaderOpen(false);
            fetchBooksForPalette();
          }}
        />
      )}

      {/* Global Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

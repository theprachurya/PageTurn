"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Command,
  BookOpen,
  Library,
  History,
  Activity,
  Settings,
  Sun,
  Moon,
  Volume2,
  Bookmark,
  Menu,
  X,
  Search,
  Upload,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommandAction {
  id: string;
  title: string;
  subtitle?: string;
  icon: typeof Command;
  category: "Navigation" | "Reader" | "Books" | "Preferences";
  perform: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  readerActions?: {
    onToggleTheme?: (theme: "light" | "dark" | "sepia") => void;
    onToggleTTS?: () => void;
    onToggleBookmark?: () => void;
    onToggleSidebar?: () => void;
    onToggleDistractionFree?: () => void;
    toc?: Array<{ id: string; label: string; href: string }>;
    onNavigateChapter?: (href: string) => void;
  };
  books?: Array<{ book_id: string; title: string; author?: string | null }>;
  onOpenUpload?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  readerActions,
  books = [],
  onOpenUpload,
}: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isReader = pathname?.startsWith("/read/");
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronously reset query and index during render when isOpen toggles to true
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
    }
  }

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const allActions = useMemo<CommandAction[]>(() => {
    const list: CommandAction[] = [];

    // Global navigation
    list.push(
      {
        id: "nav-shelf",
        title: "Go to Shelf",
        subtitle: "Continue reading & recent books",
        icon: BookOpen,
        category: "Navigation",
        shortcut: "G S",
        perform: () => {
          router.push("/shelf");
          onClose();
        },
      },
      {
        id: "nav-library",
        title: "Go to Library",
        subtitle: "View all books, tags, and collections",
        icon: Library,
        category: "Navigation",
        shortcut: "G L",
        perform: () => {
          router.push("/library");
          onClose();
        },
      },
      {
        id: "nav-stats",
        title: "Go to Reading Stats",
        subtitle: "View metrics, speeds, and charts",
        icon: Activity,
        category: "Navigation",
        shortcut: "G T",
        perform: () => {
          router.push("/stats");
          onClose();
        },
      },
      {
        id: "nav-history",
        title: "Go to Reading History",
        subtitle: "Reading sessions and streak history",
        icon: History,
        category: "Navigation",
        shortcut: "G H",
        perform: () => {
          router.push("/history");
          onClose();
        },
      },
      {
        id: "nav-settings",
        title: "Go to Settings",
        subtitle: "Account preferences & daily goals",
        icon: Settings,
        category: "Navigation",
        shortcut: "G ,",
        perform: () => {
          router.push("/settings");
          onClose();
        },
      }
    );

    if (onOpenUpload) {
      list.push({
        id: "action-upload",
        title: "Import New EPUB",
        subtitle: "Drag & drop or select local book file",
        icon: Upload,
        category: "Navigation",
        shortcut: "U",
        perform: () => {
          onClose();
          onOpenUpload();
        },
      });
    }

    // Reader-specific actions if currently inside reader
    if (isReader && readerActions) {
      if (readerActions.onToggleTheme) {
        list.push(
          {
            id: "reader-theme-dark",
            title: "Theme: Obsidian Dark",
            subtitle: "Switch reader canvas to dark mode",
            icon: Moon,
            category: "Reader",
            perform: () => {
              readerActions.onToggleTheme?.("dark");
              onClose();
            },
          },
          {
            id: "reader-theme-sepia",
            title: "Theme: Warm Sepia Paper",
            subtitle: "Switch reader canvas to warm paper",
            icon: BookOpen,
            category: "Reader",
            perform: () => {
              readerActions.onToggleTheme?.("sepia");
              onClose();
            },
          },
          {
            id: "reader-theme-light",
            title: "Theme: Clean Light",
            subtitle: "Switch reader canvas to light mode",
            icon: Sun,
            category: "Reader",
            perform: () => {
              readerActions.onToggleTheme?.("light");
              onClose();
            },
          }
        );
      }

      if (readerActions.onToggleTTS) {
        list.push({
          id: "reader-tts",
          title: "Toggle Read Aloud (TTS)",
          subtitle: "Listen to the current section using speech synthesis",
          icon: Volume2,
          category: "Reader",
          shortcut: "T",
          perform: () => {
            readerActions.onToggleTTS?.();
            onClose();
          },
        });
      }

      if (readerActions.onToggleBookmark) {
        list.push({
          id: "reader-bookmark",
          title: "Bookmark Current Page",
          subtitle: "Add or remove bookmark for this CFI position",
          icon: Bookmark,
          category: "Reader",
          shortcut: "B",
          perform: () => {
            readerActions.onToggleBookmark?.();
            onClose();
          },
        });
      }

      if (readerActions.onToggleSidebar) {
        list.push({
          id: "reader-toc",
          title: "Toggle Table of Contents / Sidebar",
          subtitle: "Open navigation panel with chapters and bookmarks",
          icon: Menu,
          category: "Reader",
          shortcut: "M",
          perform: () => {
            readerActions.onToggleSidebar?.();
            onClose();
          },
        });
      }

      if (readerActions.onToggleDistractionFree) {
        list.push({
          id: "reader-distraction-free",
          title: "Toggle Distraction-Free Mode",
          subtitle: "Hide all toolbars for full-screen document focus",
          icon: Command,
          category: "Reader",
          shortcut: "F",
          perform: () => {
            readerActions.onToggleDistractionFree?.();
            onClose();
          },
        });
      }
    }

    // Books jump
    books.forEach((b) => {
      list.push({
        id: `book-${b.book_id}`,
        title: `Open "${b.title}"`,
        subtitle: b.author ? `by ${b.author}` : "Book in your library",
        icon: BookOpen,
        category: "Books",
        perform: () => {
          router.push(`/read/${b.book_id}`);
          onClose();
        },
      });
    });

    return list;
  }, [router, onClose, onOpenUpload, isReader, readerActions, books]);

  const filteredActions = useMemo(() => {
    if (!query.trim()) return allActions;
    const q = query.toLowerCase();
    return allActions.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.subtitle && a.subtitle.toLowerCase().includes(q)) ||
        a.category.toLowerCase().includes(q)
    );
  }, [allActions, query]);

  const activeIndex = selectedIndex >= filteredActions.length ? 0 : selectedIndex;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? Math.max(0, filteredActions.length - 1) : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredActions[activeIndex]) {
        filteredActions[activeIndex].perform();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-[#14171b] border border-white/10 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden text-zinc-100 flex flex-col animate-in zoom-in-95 duration-150">
        {/* Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-[#181c22]">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={isReader ? "Search chapters, settings, or books..." : "Type a command, page, or search books..."}
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none font-sans"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-medium text-zinc-400 bg-white/5 border border-white/10 rounded">
            ESC
          </kbd>
          <button
            onClick={onClose}
            aria-label="Close command palette"
            className="p-1 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-white/5 transition-colors sm:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-transparent">
          {filteredActions.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              No matching commands or books found.
            </div>
          ) : (
            filteredActions.map((action, idx) => {
              const isSelected = idx === activeIndex;
              const Icon = action.icon;
              return (
                <div
                  key={action.id}
                  onClick={() => action.perform()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer group",
                    isSelected
                      ? "bg-gold-500/15 text-gold-300 border border-gold-500/30"
                      : "text-zinc-300 hover:bg-white/5 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                        isSelected
                          ? "bg-gold-500 text-zinc-950 border-gold-400"
                          : "bg-white/5 text-zinc-400 border-white/5 group-hover:text-zinc-200"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{action.title}</p>
                      {action.subtitle && (
                        <p className="text-xs text-zinc-500 truncate mt-0.5">
                          {action.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {action.shortcut && (
                      <span className="font-mono text-[10px] text-zinc-500 px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                        {action.shortcut}
                      </span>
                    )}
                    {isSelected && (
                      <ArrowRight className="w-3.5 h-3.5 text-gold-400 animate-in fade-in" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#101216] border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="text-zinc-600">PAGE•TURN v2.4</span>
        </div>
      </div>
    </div>
  );
}

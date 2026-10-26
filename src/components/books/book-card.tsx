"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  MoreVertical,
  Trash2,
  CheckCircle,
  Book,
  Clock,
  Folder,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { ProgressRing } from "./progress-ring";
import { cn } from "@/lib/utils";
import type { BookStatus } from "@/app/actions/library.actions";

export interface BookTag {
  id: string;
  name: string;
  color: string;
}

export interface BookShelf {
  id: string;
  name: string;
}

export interface BookData {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  cover_url: string | null;
  progress_percentage: number;
  current_cfi: string | null;
  last_read_at: string | null;
  book_id: string;
  status: BookStatus | string;
  tags?: BookTag[];
  shelves?: BookShelf[];
}

interface BookCardProps {
  book: BookData;
  variant?: "grid" | "list";
  onDelete?: (bookId: string) => void;
  onUpdateStatus?: (bookId: string, status: BookStatus) => void;
  onEditMetadata?: (bookId: string) => void;
  onManageTags?: (bookId: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  plan_to_read: {
    label: "Want to Read",
    icon: Clock,
    color: "text-blue-400 bg-blue-950/60 border-blue-500/30",
  },
  reading: {
    label: "Reading",
    icon: Book,
    color: "text-gold-400 bg-gold-950/60 border-gold-500/30",
  },
  completed: {
    label: "Finished",
    icon: CheckCircle,
    color: "text-emerald-400 bg-emerald-950/60 border-emerald-500/30",
  },
};

export function BookCard({
  book,
  variant = "grid",
  onDelete,
  onUpdateStatus,
  onEditMetadata,
  onManageTags,
}: BookCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleStatusChange = (e: React.MouseEvent, status: BookStatus) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    onUpdateStatus?.(book.book_id, status);
  };

  const handleEditMetadata = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    onEditMetadata?.(book.book_id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    onDelete?.(book.book_id);
  };

  const handleManageTags = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    onManageTags?.(book.book_id);
  };

  const closeMenu = () => setMenuOpen(false);

  const handleCardPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    event.currentTarget.style.setProperty("--card-pointer-x", `${x * 100}%`);
    event.currentTarget.style.setProperty("--card-pointer-y", `${y * 100}%`);
    event.currentTarget.style.setProperty("--card-tilt-x", `${((0.5 - y) * 4).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--card-tilt-y", `${((x - 0.5) * 5).toFixed(2)}deg`);
  };

  const handleCardPointerLeave = (event: React.PointerEvent<HTMLElement>) => {
    closeMenu();
    event.currentTarget.style.setProperty("--card-pointer-x", "50%");
    event.currentTarget.style.setProperty("--card-pointer-y", "35%");
    event.currentTarget.style.setProperty("--card-tilt-x", "0deg");
    event.currentTarget.style.setProperty("--card-tilt-y", "0deg");
  };

  const statusConfig = STATUS_CONFIG[book.status] || STATUS_CONFIG.reading;
  const StatusIcon = statusConfig.icon;

  const menu = (
    <div
      role="menu"
      className="absolute bottom-10 right-2 w-48 bg-[#181c22] border border-white/10 shadow-2xl shadow-black/80 rounded-xl py-1.5 z-50 animate-in fade-in zoom-in-95 pointer-events-auto text-zinc-200"
    >
      <div className="px-3 py-1 text-[9px] font-mono font-semibold text-zinc-500 uppercase tracking-widest border-b border-white/5 mb-1">
        Status
      </div>
      <button
        role="menuitem"
        onClick={(e) => handleStatusChange(e, "plan_to_read")}
        className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
      >
        <Clock className="w-3.5 h-3.5 text-blue-400" />
        <span>Want to Read</span>
      </button>
      <button
        role="menuitem"
        onClick={(e) => handleStatusChange(e, "reading")}
        className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
      >
        <Book className="w-3.5 h-3.5 text-gold-400" />
        <span>Currently Reading</span>
      </button>
      <button
        role="menuitem"
        onClick={(e) => handleStatusChange(e, "completed")}
        className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
      >
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        <span>Finished</span>
      </button>
      <div className="h-px bg-white/5 my-1" />
      <button
        role="menuitem"
        onClick={handleEditMetadata}
        className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
      >
        <Pencil className="w-3.5 h-3.5 text-zinc-400" />
        <span>Edit Metadata</span>
      </button>
      <button
        role="menuitem"
        onClick={handleManageTags}
        className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
      >
        <Folder className="w-3.5 h-3.5 text-zinc-400" />
        <span>Organize Tags & Shelves</span>
      </button>
      <div className="h-px bg-white/5 my-1" />
      <button
        role="menuitem"
        onClick={handleDelete}
        className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer flex items-center gap-2"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Remove Document</span>
      </button>
    </div>
  );

  const coverMenu = (
    <div className="pointer-events-auto">
      {menuOpen && menu}
      <button
        onClick={toggleMenu}
        aria-label={`Document options for ${book.title}`}
        aria-expanded={menuOpen}
        className="book-card-options absolute top-2 right-2 z-30 p-1.5 rounded-lg bg-black/60 text-zinc-300 hover:text-white hover:bg-black/90 backdrop-blur-md transition-all cursor-pointer shadow-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  if (variant === "list") {
    return (
      <div
        onPointerMove={handleCardPointerMove}
        onPointerLeave={handleCardPointerLeave}
        className="book-card group relative flex items-center gap-4 p-3.5 rounded-2xl bg-[#14171b] border border-white/[0.08] hover:border-gold-500/30 hover:bg-[#181c22] transition-all duration-300"
      >
        <Link
          href={`/read/${book.book_id}`}
          className="absolute inset-0 z-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
          aria-label={book.title}
        />

        {/* Thumbnail with physical book spine effect */}
        <div className="w-16 h-24 rounded-lg overflow-visible bg-black/50 border border-white/10 flex-shrink-0 relative z-10 pointer-events-none shadow-md">
          <div className="w-full h-full overflow-hidden rounded-lg relative">
            {/* Spine groove overlay */}
            <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/60 via-white/5 to-transparent z-10 pointer-events-none" />
            {book.cover_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700">
                <BookOpen className="w-6 h-6" />
              </div>
            )}
            {book.status === "completed" && (
              <div className="absolute top-1 left-1 bg-emerald-500 text-zinc-950 p-0.5 rounded shadow-sm z-20">
                <CheckCircle className="w-3 h-3 stroke-[2.5]" />
              </div>
            )}
          </div>
          {coverMenu}
        </div>

        {/* Book Details */}
        <div className="flex-1 min-w-0 pr-6 relative z-10 pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-sm text-zinc-100 group-hover:text-gold-400 transition-colors truncate">
              {book.title}
            </h3>
            {book.status !== "reading" && (
              <span
                className={cn(
                  "text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full font-medium whitespace-nowrap border",
                  statusConfig.color
                )}
              >
                {statusConfig.label}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 truncate mb-2">{book.author || "Unknown Author"}</p>

          {/* Tags */}
          {book.tags && book.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {book.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="text-[9px] px-2 py-0.5 rounded-full border border-white/10 text-zinc-400 bg-white/[0.03] flex items-center gap-1 font-mono"
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Progress */}
          {book.status !== "completed" && (
            <div className="flex items-center gap-3 mt-1">
              <div className="flex-1 max-w-xs h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-400 rounded-full transition-all duration-500"
                  style={{ width: `${book.progress_percentage}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-gold-400 font-semibold">
                {Math.round(book.progress_percentage)}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Grid Variant
  return (
    <div
      onPointerMove={handleCardPointerMove}
      onPointerLeave={handleCardPointerLeave}
      className="book-card group relative flex flex-col rounded-2xl bg-[#14171b] border border-white/[0.08] hover:border-gold-500/35 overflow-hidden transition-all duration-300"
    >
      <Link
        href={`/read/${book.book_id}`}
        className="absolute inset-0 z-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        aria-label={book.title}
      />

      {/* Cover Canvas */}
      <div className="aspect-[2/3] w-full bg-black/40 relative overflow-visible z-10 pointer-events-none">
        <div className="w-full h-full overflow-hidden rounded-t-2xl relative">
          {/* Physical book spine curvature gradient on left edge */}
          <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/70 via-white/10 to-transparent z-10 pointer-events-none" />
          {/* Subtle paper top edge highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-white/20 z-10 pointer-events-none" />

          {book.cover_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={book.cover_url}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/90 text-zinc-600 p-4 text-center">
              <BookOpen className="w-10 h-10 mb-2 opacity-60" />
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest line-clamp-1">
                {book.author || "DOCUMENT"}
              </span>
            </div>
          )}

          {/* Status Badge */}
          {book.status !== "reading" && (
            <div className="absolute top-2.5 left-2.5 shadow-lg z-20">
              <div
                className={cn(
                  "flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold border backdrop-blur-md",
                  statusConfig.color
                )}
              >
                <StatusIcon className="w-3 h-3" />
                <span>{statusConfig.label}</span>
              </div>
            </div>
          )}

          {/* Radial progress ring on hover */}
          {book.status !== "completed" && (
            <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
              <ProgressRing percentage={book.progress_percentage} size={36} strokeWidth={3} />
            </div>
          )}
        </div>

        {coverMenu}
      </div>

      {/* Information Area */}
      <div className="p-3.5 flex-1 flex flex-col relative z-10 pointer-events-none bg-[#14171b]">
        <h3 className="font-bold text-xs leading-snug text-zinc-100 group-hover:text-gold-400 transition-colors line-clamp-2 mb-1">
          {book.title}
        </h3>
        <p className="text-[11px] text-zinc-500 truncate mb-2">{book.author || "Unknown Author"}</p>

        {/* Tag Badges */}
        {book.tags && book.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto mb-2">
            {book.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/10 text-zinc-400 bg-white/[0.03] flex items-center gap-1"
              >
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </span>
            ))}
            {book.tags.length > 2 && (
              <span className="text-[8px] font-mono text-zinc-500 px-1 py-0.5">
                +{book.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Bottom edge progress line */}
        {book.status !== "completed" && (
          <div className="h-0.5 w-full bg-white/5 relative mt-auto rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gold-400 transition-all duration-500"
              style={{ width: `${book.progress_percentage}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, MoreVertical, Trash2, CheckCircle, Book, Clock, Folder, Pencil, type LucideIcon } from "lucide-react";
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
  plan_to_read: { label: "Plan to Read", icon: Clock, color: "text-blue-400 bg-blue-950/50 border-blue-800/30" },
  reading: { label: "Reading", icon: Book, color: "text-gold-400 bg-gold-950/50 border-gold-800/30" },
  completed: { label: "Completed", icon: CheckCircle, color: "text-emerald-400 bg-emerald-950/50 border-emerald-800/30" },
};

export function BookCard({ book, variant = "grid", onDelete, onUpdateStatus, onEditMetadata, onManageTags }: BookCardProps) {
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
  const handleCardPointerMove = (event: React.PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    event.currentTarget.style.setProperty("--card-pointer-x", `${x * 100}%`);
    event.currentTarget.style.setProperty("--card-pointer-y", `${y * 100}%`);
    event.currentTarget.style.setProperty("--card-tilt-x", `${((0.5 - y) * 4).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--card-tilt-y", `${((x - 0.5) * 5).toFixed(2)}deg`);
  };

  const handleCardPointerLeave = (event: React.PointerEvent<HTMLAnchorElement>) => {
    closeMenu();
    event.currentTarget.style.setProperty("--card-pointer-x", "50%");
    event.currentTarget.style.setProperty("--card-pointer-y", "35%");
    event.currentTarget.style.setProperty("--card-tilt-x", "0deg");
    event.currentTarget.style.setProperty("--card-tilt-y", "0deg");
  };

  const statusConfig = STATUS_CONFIG[book.status] || STATUS_CONFIG.reading;
  const StatusIcon = statusConfig.icon;

  const menu = (
    <div className="absolute bottom-10 right-2 w-44 bg-[#151517] border border-zinc-800/80 shadow-2xl shadow-black/60 rounded-xl py-1.5 z-20 animate-in fade-in slide-in-from-bottom-2">
      <div className="px-3 py-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Status</div>
      <button onClick={(e) => handleStatusChange(e, "plan_to_read")} className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors cursor-pointer flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-blue-400" /> Plan to Read</button>
      <button onClick={(e) => handleStatusChange(e, "reading")} className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors cursor-pointer flex items-center gap-2"><Book className="w-3.5 h-3.5 text-gold-400" /> Reading</button>
      <button onClick={(e) => handleStatusChange(e, "completed")} className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors cursor-pointer flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Completed</button>
      <div className="h-px bg-zinc-800/60 my-1" />
      <button onClick={handleEditMetadata} className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors cursor-pointer flex items-center gap-2"><Pencil className="w-3.5 h-3.5 text-zinc-500" /> Edit Metadata</button>
      <button onClick={handleManageTags} className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors cursor-pointer flex items-center gap-2"><Folder className="w-3.5 h-3.5 text-zinc-500" /> Organize...</button>
      <button onClick={handleDelete} className="w-full text-left px-3 py-1.5 text-xs text-red-400/80 hover:bg-red-950/30 transition-colors cursor-pointer flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
    </div>
  );

  const coverMenu = (
    <>
      {menuOpen && menu}
      <button onClick={toggleMenu} aria-label={`Options for ${book.title}`} aria-expanded={menuOpen} className="book-card-options absolute bottom-2 right-2 z-30 p-2 rounded-lg bg-black/60 text-zinc-300 hover:text-white hover:bg-black/80 backdrop-blur-sm transition-colors cursor-pointer shadow-lg opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
        <MoreVertical className="w-4 h-4" />
      </button>
    </>
  );

  if (variant === "list") {
    return (
      <Link href={`/read/${book.book_id}`} onPointerMove={handleCardPointerMove} onPointerLeave={handleCardPointerLeave} className="book-card group relative flex gap-4 p-4 border border-[#1f1f23]">
        <div className="w-20 h-28 rounded-lg overflow-visible bg-zinc-950 border border-zinc-800/60 flex-shrink-0 relative">
          <div className="w-full h-full overflow-hidden rounded-lg">
            {book.cover_url ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-zinc-900"><BookOpen className="w-8 h-8 text-zinc-800" /></div>}
            {book.status === "completed" && <div className="absolute top-1 left-1 bg-emerald-600/90 text-white p-1 rounded-md shadow-sm"><CheckCircle className="w-3 h-3" /></div>}
          </div>
          {coverMenu}
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <div className="flex items-center gap-2 mb-1"><h3 className="font-semibold text-zinc-100 group-hover:text-gold-400 transition-colors truncate">{book.title}</h3>{book.status !== "reading" && <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap border", statusConfig.color)}>{statusConfig.label}</span>}</div>
          <p className="text-sm text-zinc-500 mb-2">{book.author || "Unknown Author"}</p>
          {book.tags && book.tags.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{book.tags.map(tag => <span key={tag.id} className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-800/80 text-zinc-400 bg-zinc-900/40 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />{tag.name}</span>)}</div>}
          {!book.tags?.length && book.description && <p className="text-xs text-zinc-600 line-clamp-1 mb-2">{book.description}</p>}
          {book.status !== "completed" && <div className="flex items-center gap-2 mt-auto"><div className="flex-1 h-1 bg-zinc-800/80 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-gold-500 to-gold-400 rounded-full transition-all duration-500" style={{ width: `${book.progress_percentage}%` }} /></div><span className="text-xs font-semibold text-gold-500 font-mono">{Math.round(book.progress_percentage)}%</span></div>}
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/read/${book.book_id}`} onPointerMove={handleCardPointerMove} onPointerLeave={handleCardPointerLeave} className="book-card group relative flex flex-col border border-[#1f1f23]">
      <div className="aspect-[2/3] w-full bg-zinc-950 relative overflow-visible">
        <div className="w-full h-full overflow-hidden rounded-t-xl">
          {book.cover_url ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center bg-zinc-950"><BookOpen className="w-12 h-12 text-zinc-800" /></div>}
          {book.status !== "reading" && <div className="absolute top-2 left-2 shadow-md"><div className={cn("flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border backdrop-blur-md", statusConfig.color)}><StatusIcon className="w-3 h-3" />{statusConfig.label}</div></div>}
          {book.status !== "completed" && <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"><ProgressRing percentage={book.progress_percentage} size={40} strokeWidth={3} /></div>}
        </div>
        {coverMenu}
      </div>
      <div className="p-3.5 flex-1 flex flex-col">
        <h3 className="min-h-10 line-clamp-2 font-semibold text-sm leading-5 text-zinc-100 group-hover:text-gold-400 transition-colors">{book.title}</h3>
        <p className="text-xs text-zinc-500 truncate mt-0.5 mb-2">{book.author || "Unknown Author"}</p>
        {book.tags && book.tags.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{book.tags.slice(0, 3).map(tag => <span key={tag.id} className="text-[9px] px-1.5 py-0.5 rounded-full border border-zinc-800/60 text-zinc-400 bg-zinc-900/30 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />{tag.name}</span>)}{book.tags.length > 3 && <span className="text-[9px] px-1 py-0.5 rounded-full text-zinc-600">+{book.tags.length - 3}</span>}</div>}
      </div>
      {book.status !== "completed" && <div className="h-0.5 w-full bg-zinc-800/60 relative mt-auto"><div className="absolute top-0 left-0 h-full bg-gold-500 transition-all duration-500 group-hover:shadow-[0_0_6px_rgba(212,168,83,0.6)]" style={{ width: `${book.progress_percentage}%` }} /></div>}
    </Link>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, MoreVertical, Trash2, CheckCircle, Book, Clock, Folder, Sparkles } from "lucide-react";
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
  onManageTags?: (bookId: string) => void;
  onAIRecap?: (book: BookData) => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  plan_to_read: { label: "Plan to Read", icon: Clock, color: "text-blue-500 bg-blue-50" },
  reading: { label: "Reading", icon: Book, color: "text-purple-600 bg-purple-50" },
  completed: { label: "Completed", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
};

export function BookCard({ book, variant = "grid", onDelete, onUpdateStatus, onManageTags, onAIRecap }: BookCardProps) {
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

  const handleAIRecap = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    onAIRecap?.(book);
  };

  // Click away listener equivalent - since this is a simple custom dropdown, 
  // relying on onMouseLeave to close it automatically keeps it simple without global listeners
  const closeMenu = () => setMenuOpen(false);

  const statusConfig = STATUS_CONFIG[book.status] || STATUS_CONFIG.reading;
  const StatusIcon = statusConfig.icon;

  if (variant === "list") {
    return (
      <Link
        href={`/read/${book.book_id}`}
        onMouseLeave={closeMenu}
        className="group relative flex gap-4 p-4 rounded-2xl bg-white border border-purple-100/50 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-100/50 transition-all duration-300"
      >
        {/* Cover */}
        <div className="w-20 h-28 rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 to-lavender-100 flex-shrink-0 relative">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-purple-300" />
            </div>
          )}
          {book.status === "completed" && (
            <div className="absolute top-1 left-1 bg-emerald-500 text-white p-1 rounded-md shadow-sm">
              <CheckCircle className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pr-8">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-800 group-hover:text-purple-700 transition-colors truncate">
              {book.title}
            </h3>
            {book.status !== "reading" && (
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap", statusConfig.color)}>
                {statusConfig.label}
              </span>
            )}
          </div>
          
          <p className="text-sm text-slate-500 mb-1">{book.author || "Unknown Author"}</p>
          
          {/* Tags */}
          {book.tags && book.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {book.tags.map(tag => (
                <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-full border border-slate-200 text-slate-600 bg-slate-50 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          
          {!book.tags?.length && book.description && (
            <p className="text-xs text-slate-400 line-clamp-1 mb-2">
              {book.description}
            </p>
          )}

          {book.status !== "completed" && (
            <div className="flex items-center gap-2 mt-auto">
              <div className="flex-1 h-1.5 bg-purple-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-400 to-lavender-500 rounded-full transition-all duration-500"
                  style={{ width: `${book.progress_percentage}%` }}
                />
              </div>
              <span className="text-xs font-medium text-purple-600">
                {Math.round(book.progress_percentage)}%
              </span>
            </div>
          )}
        </div>

        {/* Options Menu */}
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleMenu}
            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 top-8 w-40 bg-white border border-slate-100 shadow-xl rounded-xl py-1 z-20 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</div>
              <button onClick={(e) => handleStatusChange(e, "plan_to_read")} className="w-full text-left px-3 py-1.5 text-sm text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Plan to Read
              </button>
              <button onClick={(e) => handleStatusChange(e, "reading")} className="w-full text-left px-3 py-1.5 text-sm text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer flex items-center gap-2">
                <Book className="w-3.5 h-3.5" /> Reading
              </button>
              <button onClick={(e) => handleStatusChange(e, "completed")} className="w-full text-left px-3 py-1.5 text-sm text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" /> Completed
              </button>
              
              <div className="h-px bg-slate-100 my-1" />
              
              <button onClick={handleAIRecap} className="w-full text-left px-3 py-1.5 text-sm text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" /> AI Recap
              </button>
              <button onClick={handleManageTags} className="w-full text-left px-3 py-1.5 text-sm text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer flex items-center gap-2">
                <Folder className="w-3.5 h-3.5" /> Organize...
              </button>
              <button onClick={handleDelete} className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/read/${book.book_id}`}
      onMouseLeave={closeMenu}
      className="group relative flex flex-col rounded-2xl bg-white border border-purple-100/50 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-100/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
    >
      {/* Cover */}
      <div className="aspect-[2/3] w-full bg-gradient-to-br from-purple-100 to-lavender-100 relative overflow-hidden">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-purple-300" />
          </div>
        )}
        
        {/* Status Badge */}
        {book.status !== "reading" && (
          <div className="absolute top-2 left-2 shadow-sm">
            <div className={cn("flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium backdrop-blur-md bg-white/90", statusConfig.color)}>
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </div>
          </div>
        )}

        {/* Options Menu Toggle */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={toggleMenu}
            className="p-1.5 rounded-lg bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-colors cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Options Dropdown */}
        {menuOpen && (
          <div className="absolute top-10 right-2 w-40 bg-white border border-slate-100 shadow-xl rounded-xl py-1 z-20 animate-in fade-in slide-in-from-top-2">
            <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</div>
            <button onClick={(e) => handleStatusChange(e, "plan_to_read")} className="w-full text-left px-3 py-1.5 text-sm text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Plan to Read
            </button>
            <button onClick={(e) => handleStatusChange(e, "reading")} className="w-full text-left px-3 py-1.5 text-sm text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer flex items-center gap-2">
              <Book className="w-3.5 h-3.5" /> Reading
            </button>
            <button onClick={(e) => handleStatusChange(e, "completed")} className="w-full text-left px-3 py-1.5 text-sm text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5" /> Completed
            </button>
            <div className="h-px bg-slate-100 my-1" />
            <button onClick={handleAIRecap} className="w-full text-left px-3 py-1.5 text-sm text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" /> AI Recap
            </button>
            <button onClick={handleManageTags} className="w-full text-left px-3 py-1.5 text-sm text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer flex items-center gap-2">
              <Folder className="w-3.5 h-3.5" /> Organize...
            </button>
            <button onClick={handleDelete} className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        )}

        {/* Progress overlay */}
        {book.status !== "completed" && (
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <ProgressRing percentage={book.progress_percentage} size={40} strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm text-slate-800 group-hover:text-purple-700 transition-colors truncate">
          {book.title}
        </h3>
        <p className="text-xs text-slate-500 truncate mt-0.5 mb-2">
          {book.author || "Unknown Author"}
        </p>
        
        {/* Tags Snippet */}
        {book.tags && book.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {book.tags.slice(0, 3).map(tag => (
              <span key={tag.id} className="text-[9px] px-1.5 py-0.5 rounded-full border border-slate-200 text-slate-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </span>
            ))}
            {book.tags.length > 3 && (
              <span className="text-[9px] px-1 py-0.5 rounded-full text-slate-400">
                +{book.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {book.status !== "completed" && (
          <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-50">
            <div className="flex-1 h-1 bg-purple-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-lavender-500 rounded-full transition-all duration-500"
                style={{ width: `${book.progress_percentage}%` }}
              />
            </div>
            <span className="text-[10px] font-medium text-purple-500">
              {Math.round(book.progress_percentage)}%
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

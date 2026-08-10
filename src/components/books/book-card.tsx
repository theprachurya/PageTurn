"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { ProgressRing } from "./progress-ring";
import { cn } from "@/lib/utils";

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
  status: string;
}

interface BookCardProps {
  book: BookData;
  variant?: "grid" | "list";
}

export function BookCard({ book, variant = "grid" }: BookCardProps) {
  if (variant === "list") {
    return (
      <Link
        href={`/read/${book.book_id}`}
        className="group flex gap-4 p-4 rounded-2xl bg-white border border-purple-100/50 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-100/50 transition-all duration-300"
      >
        {/* Cover */}
        <div className="w-20 h-28 rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 to-lavender-100 flex-shrink-0">
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
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 group-hover:text-purple-700 transition-colors truncate">
            {book.title}
          </h3>
          <p className="text-sm text-slate-500 mb-1">{book.author || "Unknown Author"}</p>
          {book.description && (
            <p className="text-xs text-slate-400 line-clamp-2 mb-2">
              {book.description}
            </p>
          )}
          <div className="flex items-center gap-2">
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
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/read/${book.book_id}`}
      className="group flex flex-col rounded-2xl bg-white border border-purple-100/50 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-100/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
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
        {/* Progress overlay */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <ProgressRing percentage={book.progress_percentage} size={40} strokeWidth={3} />
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-sm text-slate-800 group-hover:text-purple-700 transition-colors truncate">
          {book.title}
        </h3>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          {book.author || "Unknown Author"}
        </p>
        <div className="flex items-center gap-2 mt-3">
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
      </div>
    </Link>
  );
}

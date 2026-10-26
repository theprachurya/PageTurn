"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Settings, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { appEvents } from "@/lib/app-events";

const navItems = [
  { href: "/shelf", label: "Shelf" },
  { href: "/library", label: "Library" },
  { href: "/history", label: "History" },
  { href: "/stats", label: "Insights" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="app-top-nav hidden md:flex fixed top-0 left-0 w-full z-50 justify-between items-center px-6 lg:px-10 h-16 border-b text-zinc-900 font-sans">
      <div className="flex items-center gap-10">
        <Link href="/shelf" className="flex items-center gap-2.5 group" aria-label="PageTurn home">
          <div className="app-brand-mark flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:-rotate-3">
            <BookOpen className="w-4 h-4" strokeWidth={1.8} />
          </div>
          <span className="app-brand text-[15px] font-semibold tracking-tight flex items-center gap-1">
            PageTurn
          </span>
        </Link>

        <nav className="flex h-16 items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-full items-center px-3 text-[13px] font-medium transition-colors",
                  isActive
                    ? "text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-900"
                )}
                data-active={isActive ? "true" : undefined}
                aria-current={isActive ? "page" : undefined}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* Command Palette Trigger */}
        <button
          onClick={() => appEvents.openCommandPalette()}
          aria-label="Open command palette"
          className="app-nav-search flex h-9 items-center gap-2 px-3 rounded-md border text-[12px] text-zinc-500 transition-colors group cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-900 transition-colors" />
          <span className="text-zinc-500 group-hover:text-zinc-900">Search</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-400 bg-white/10 border border-white/10 rounded">
            ⌘ K
          </kbd>
        </button>

        {/* Quick Upload Button */}
        <button
          onClick={() => appEvents.openUploader()}
          className="app-nav-import inline-flex h-9 items-center gap-1.5 px-3.5 rounded-md font-medium text-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Import</span>
        </button>

        <div className="h-5 w-px bg-black/10 mx-1" />

        <Link
          href="/settings"
          aria-label="Settings"
          className={cn(
            "p-2 rounded-lg transition-all",
            pathname.startsWith("/settings")
              ? "text-zinc-900"
              : "text-zinc-500 hover:text-zinc-900"
          )}
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}

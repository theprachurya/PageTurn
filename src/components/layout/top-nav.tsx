"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Settings, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { appEvents } from "@/lib/app-events";

const navItems = [
  { href: "/shelf", label: "Shelf", code: "01" },
  { href: "/library", label: "Library", code: "02" },
  { href: "/history", label: "History", code: "03" },
  { href: "/stats", label: "Stats", code: "04" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="app-top-nav hidden md:flex fixed top-0 left-0 w-full z-50 justify-between items-center px-6 lg:px-8 h-14 bg-[#121417]/95 backdrop-blur-xl border-b border-white/[0.08] text-zinc-100 font-sans">
      <div className="flex items-center gap-8">
        <Link href="/shelf" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-gold-500 text-zinc-950 flex items-center justify-center font-bold text-xs shadow-sm transition-transform group-hover:scale-105">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="app-brand text-sm font-bold tracking-tight text-zinc-100 flex items-center gap-1">
              PAGE<span className="text-gold-400">TURN</span>
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse inline-block" />
            </span>
          </div>
        </Link>

        <nav className="flex gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all group",
                  isActive
                    ? "text-gold-400 bg-gold-500/10 border border-gold-500/25"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
                )}
                data-active={isActive ? "true" : undefined}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="font-mono text-[9px] opacity-40 group-hover:opacity-80 transition-opacity">
                  {item.code}
                </span>
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
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-gold-500/40 text-xs text-zinc-400 hover:text-zinc-200 transition-all font-mono group cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-gold-400 transition-colors" />
          <span className="text-zinc-400 group-hover:text-zinc-200">Search & Commands</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-400 bg-white/10 border border-white/10 rounded">
            ⌘K
          </kbd>
        </button>

        {/* Quick Upload Button */}
        <button
          onClick={() => appEvents.openUploader()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-500 text-zinc-950 font-semibold text-xs hover:bg-gold-400 active:scale-95 transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Import</span>
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        <Link
          href="/settings"
          aria-label="Settings"
          className={cn(
            "p-2 rounded-lg transition-all",
            pathname.startsWith("/settings")
              ? "text-gold-400 bg-gold-500/10"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
          )}
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}

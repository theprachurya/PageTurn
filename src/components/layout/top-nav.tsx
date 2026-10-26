"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Settings, Search, Plus, Library, NotebookPen, Clock3, ChartNoAxesColumnIncreasing, House } from "lucide-react";
import { cn } from "@/lib/utils";
import { appEvents } from "@/lib/app-events";

const navItems = [
  { href: "/shelf", label: "Today", icon: House },
  { href: "/library", label: "Library", icon: Library },
  { href: "/notebook", label: "Notebook", icon: NotebookPen },
];

const insightsItems = [
  { href: "/history", label: "Reading history", icon: Clock3 },
  { href: "/stats", label: "Insights", icon: ChartNoAxesColumnIncreasing },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="app-sidebar hidden md:flex fixed inset-y-0 left-0 z-50 w-[232px] flex-col px-4 py-5">
        <Link href="/shelf" className="flex h-11 items-center gap-3 px-2 group" aria-label="PageTurn home">
          <div className="app-brand-mark flex h-8 w-8 items-center justify-center rounded-[10px] transition-transform group-hover:-rotate-3">
            <BookOpen className="w-4 h-4" strokeWidth={1.8} />
          </div>
          <span className="app-brand text-[16px] font-semibold tracking-tight">PageTurn</span>
        </Link>

        <button onClick={() => appEvents.openCommandPalette()} className="app-sidebar-search mt-7 flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[12px] text-zinc-500 transition-colors" aria-label="Search your library">
          <Search className="w-4 h-4" />
          <span className="flex-1">Search your library</span>
          <kbd>⌘ K</kbd>
        </button>

        <p className="app-nav-label px-3 pb-2 pt-8">Your reading</p>
        <nav className="flex flex-col gap-1" aria-label="Primary navigation">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className="app-side-link" data-active={isActive ? "true" : undefined} aria-current={isActive ? "page" : undefined}>
                <item.icon className="h-[17px] w-[17px]" strokeWidth={1.7} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <p className="app-nav-label px-3 pb-2 pt-8">Your progress</p>
        <nav className="flex flex-col gap-1" aria-label="Reading activity">
          {insightsItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className="app-side-link" data-active={isActive ? "true" : undefined} aria-current={isActive ? "page" : undefined}>
                <item.icon className="h-[17px] w-[17px]" strokeWidth={1.7} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[var(--app-line)] pt-3">
          <Link href="/settings" className="app-side-link" data-active={pathname.startsWith("/settings") ? "true" : undefined} aria-current={pathname.startsWith("/settings") ? "page" : undefined}>
            <Settings className="h-[17px] w-[17px]" strokeWidth={1.7} />
            <span>Settings</span>
          </Link>
        </div>
      </aside>

      <header className="app-top-nav fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between px-4 md:left-[232px] md:h-[68px] md:px-8">
        <Link href="/shelf" className="flex items-center gap-2.5 md:hidden" aria-label="PageTurn home">
          <div className="app-brand-mark flex h-8 w-8 items-center justify-center rounded-[10px]"><BookOpen className="w-4 h-4" strokeWidth={1.8} /></div>
          <span className="app-brand text-[15px] font-semibold tracking-tight">PageTurn</span>
        </Link>
        <span className="hidden md:block text-[13px] text-zinc-500">A little more room to read.</span>
        <div className="flex items-center gap-2 md:gap-3">
        {/* Command Palette Trigger */}
        <button
          onClick={() => appEvents.openCommandPalette()}
          aria-label="Open command palette"
          className="app-nav-search flex h-9 items-center gap-2 rounded-lg border px-3 text-[12px] text-zinc-500 transition-colors group cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-900 transition-colors" />
          <span className="hidden sm:inline text-zinc-500 group-hover:text-zinc-900">Search</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 bg-white/10 border border-white/10 rounded">
            ⌘ K
          </kbd>
        </button>

        {/* Quick Upload Button */}
        <button
          onClick={() => appEvents.openUploader()}
          className="app-nav-import inline-flex h-9 items-center gap-1.5 px-3.5 rounded-lg font-medium text-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Import</span>
        </button>

        <Link href="/settings" aria-label="Settings" className={cn("flex h-9 w-9 items-center justify-center rounded-lg transition-all md:hidden", pathname.startsWith("/settings") ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-900")}>
          <Settings className="w-4 h-4" />
        </Link>
        </div>
      </header>
    </>
  );
}

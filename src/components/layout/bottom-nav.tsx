"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Library, History, Activity, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { appEvents } from "@/lib/app-events";

const navItems = [
  { href: "/shelf", label: "Shelf", icon: BookOpen },
  { href: "/library", label: "Library", icon: Library },
  { href: "/history", label: "History", icon: History },
  { href: "/stats", label: "Stats", icon: Activity },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="app-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121417]/96 backdrop-blur-xl border-t border-white/[0.08] safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px] min-h-[44px] justify-center relative active:scale-95",
                isActive
                  ? "text-gold-400"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
              data-active={isActive ? "true" : undefined}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className={cn("w-4.5 h-4.5", isActive && "text-gold-400")} />
              <span
                className={cn(
                  "font-mono text-[9px] uppercase tracking-[0.08em] font-medium",
                  isActive ? "text-gold-400 font-semibold" : "text-zinc-500"
                )}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="bottom-nav-indicator absolute top-0 w-6 h-0.5 bg-gold-400 rounded-full" />
              )}
            </Link>
          );
        })}

        {/* Search & Command Palette trigger on mobile */}
        <button
          onClick={() => appEvents.openCommandPalette()}
          aria-label="Open command search"
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px] min-h-[44px] justify-center text-zinc-500 active:scale-95"
        >
          <Search className="w-4.5 h-4.5" />
          <span className="font-mono text-[9px] uppercase tracking-[0.08em] font-medium">
            Search
          </span>
        </button>
      </div>
    </nav>
  );
}

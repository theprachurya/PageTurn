"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/library", label: "Library" },
  { href: "/shelf", label: "Shelf" },
  { href: "/stats", label: "Stats" },
  { href: "/history", label: "History" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="hidden md:flex fixed top-0 left-0 w-full z-50 justify-between items-center px-8 h-14 bg-[#08080a]/85 backdrop-blur-2xl border-b border-zinc-800/40 text-zinc-100 font-sans">
      <div className="flex items-center gap-8">
        <Link href="/shelf" className="flex items-center gap-2.5 group">
          <BookOpen className="w-5 h-5 text-gold-500 transition-colors group-hover:text-gold-400" />
          <h1 className="text-lg font-semibold tracking-tight">
            Page<span className="text-gold-500">Turn</span>
          </h1>
        </Link>
        <nav className="flex gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg transition-all text-sm font-medium",
                  isActive
                    ? "text-gold-400 bg-gold-500/8"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-1">
        <Link href="/settings" className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-all">
          <Settings className="w-4.5 h-4.5" />
        </Link>
        <button className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-all">
          <User className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
}

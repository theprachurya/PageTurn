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
    <header className="hidden md:flex fixed top-0 left-0 w-full z-50 justify-between items-center px-8 h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/60 text-zinc-100 font-sans">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-red-500" />
          <h1 className="text-xl font-bold tracking-tight">
            Page<span className="text-red-500">Turn</span>
          </h1>
        </div>
        <nav className="flex gap-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 rounded-lg transition-all text-sm",
                  isActive
                    ? "text-zinc-100 font-semibold border-b-2 border-red-500 bg-zinc-900/50"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/settings" className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 rounded-lg transition-all">
          <Settings className="w-5 h-5" />
        </Link>
        <button className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 rounded-lg transition-all">
          <User className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

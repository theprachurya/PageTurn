"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Library, History, Settings, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/shelf", label: "Shelf", icon: BookOpen },
  { href: "/library", label: "Library", icon: Library },
  { href: "/history", label: "History", icon: History },
  { href: "/stats", label: "Stats", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-zinc-950/90 backdrop-blur-xl border-r border-zinc-800/80 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-zinc-800/60">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-950/50">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-zinc-100">
          Page<span className="text-red-500">Turn</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-red-950/30 text-red-400 border border-red-900/40 shadow-sm font-semibold"
                  : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-red-500" : "text-zinc-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom info */}
      <div className="px-6 py-4 border-t border-zinc-800/60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-zinc-500 font-mono">Crimson Dark v1.0</span>
        </div>
      </div>
    </aside>
  );
}


"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Library, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/shelf", label: "Shelf", icon: BookOpen },
  { href: "/library", label: "Library", icon: Library },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white/80 backdrop-blur-xl border-r border-purple-100/50 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-purple-100/50">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-lavender-600 flex items-center justify-center">
          <BookOpen className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-purple-950">
          PageTurn
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-purple-100 text-purple-700 shadow-sm"
                  : "text-slate-600 hover:bg-purple-50 hover:text-purple-600"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "text-purple-600")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom decoration */}
      <div className="px-4 py-6 border-t border-purple-100/50">
        <div className="text-xs text-purple-300">PageTurn v1.0</div>
      </div>
    </aside>
  );
}

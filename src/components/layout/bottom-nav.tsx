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

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/80 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px] relative",
                isActive
                  ? "text-red-500"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "text-red-500")} />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isActive ? "text-red-400 font-semibold" : "text-zinc-500"
                )}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-6 h-0.5 bg-red-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


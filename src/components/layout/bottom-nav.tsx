"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Library, NotebookPen, History, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/shelf", label: "Today", icon: BookOpen },
  { href: "/library", label: "Library", icon: Library },
  { href: "/notebook", label: "Notebook", icon: NotebookPen },
  { href: "/history", label: "History", icon: History },
  { href: "/stats", label: "Insights", icon: Activity },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="app-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-40 border-t safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-1.5">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-1.5 py-1.5 transition-all duration-200 min-w-[52px] min-h-[48px] justify-center relative active:scale-95",
                isActive
                  ? "text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-800"
              )}
              data-active={isActive ? "true" : undefined}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="w-[18px] h-[18px]" strokeWidth={1.7} />
              <span
                className={cn(
                  "text-[10px] tracking-[0.01em] font-medium",
                  isActive ? "text-zinc-900 font-semibold" : "text-zinc-500"
                )}
              >
                {item.label}
              </span>
              {isActive && (
              <div className="bottom-nav-indicator absolute top-0 w-7 h-0.5" />
              )}
            </Link>
          );
        })}

      </div>
    </nav>
  );
}

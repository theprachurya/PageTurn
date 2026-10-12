"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "./top-nav";
import { BottomNav } from "./bottom-nav";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReader = pathname?.startsWith("/read/");

  return (
    <div className="app-shell min-h-screen bg-[#17201b] text-zinc-50 selection:bg-gold-500/20 selection:text-gold-200">
      {!isReader && (
        <div className="app-orbit" aria-hidden="true" />
      )}
      {!isReader && <TopNav />}
      {!isReader && <BottomNav />}
      <main className={cn("min-h-screen relative z-10", !isReader && "pt-16 pb-20 md:pb-0")}>
        {children}
      </main>
    </div>
  );
}

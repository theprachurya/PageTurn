"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "./top-nav";
import { BottomNav } from "./bottom-nav";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReader = pathname?.startsWith("/read/");

  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-50 selection:bg-gold-500/20 selection:text-gold-200">
      {/* Ambient background lighting — subtle warm glow */}
      {!isReader && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-32 right-1/4 w-[600px] h-[600px] bg-gold-900/8 rounded-full blur-[180px]" />
          <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-gold-950/6 rounded-full blur-[200px]" />
        </div>
      )}
      {!isReader && <TopNav />}
      {!isReader && <BottomNav />}
      <main className={cn("min-h-screen relative z-10", !isReader && "pt-16 pb-20 md:pb-0")}>
        {children}
      </main>
    </div>
  );
}

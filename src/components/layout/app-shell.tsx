"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReader = pathname?.startsWith("/read/");

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-red-500/30 selection:text-red-200">
      {/* Ambient background lighting */}
      {!isReader && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-red-950/15 rounded-full blur-[140px]" />
          <div className="absolute bottom-10 left-1/3 w-[600px] h-[600px] bg-rose-950/10 rounded-full blur-[160px]" />
        </div>
      )}
      {!isReader && <Sidebar />}
      {!isReader && <BottomNav />}
      <main className={cn("min-h-screen relative z-10", !isReader && "md:ml-64 pb-20 md:pb-0")}>
        {children}
      </main>
    </div>
  );
}


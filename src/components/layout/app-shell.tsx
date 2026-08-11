"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReader = pathname?.startsWith("/read/");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-lavender-50/30">
      {!isReader && <Sidebar />}
      {!isReader && <BottomNav />}
      <main className={cn("min-h-screen", !isReader && "md:ml-64 pb-20 md:pb-0")}>
        {children}
      </main>
    </div>
  );
}

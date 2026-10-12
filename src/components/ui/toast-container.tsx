"use client";

import { useEffect, useState } from "react";
import { toast, type ToastItem } from "@/lib/toast";
import { X, CheckCircle2, AlertTriangle, Info, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe((updated) => {
      setItems(updated);
    });
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {items.map((item) => {
        const isSuccess = item.type === "success";
        const isError = item.type === "error";
        const isSignal = item.type === "signal";

        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-bottom-3 fade-in",
              "bg-[#14171b]/95 border-white/10 text-zinc-100",
              isSignal && "border-gold-500/40 shadow-gold-500/10",
              isError && "border-red-500/40 shadow-red-500/10",
              isSuccess && "border-emerald-500/40 shadow-emerald-500/10"
            )}
          >
            {/* Status dot / Icon */}
            <div className="mt-0.5 flex-shrink-0">
              {isSignal && <Zap className="w-4 h-4 text-gold-400 fill-gold-400" />}
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {isError && <AlertTriangle className="w-4 h-4 text-red-400" />}
              {!isSignal && !isSuccess && !isError && <Info className="w-4 h-4 text-zinc-400" />}
            </div>

            <div className="flex-1 min-w-0">
              {item.title && (
                <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 font-medium mb-0.5">
                  {item.title}
                </p>
              )}
              <p className="text-xs text-zinc-200 leading-snug">{item.message}</p>
            </div>

            <button
              onClick={() => toast.dismiss(item.id)}
              aria-label="Dismiss notification"
              className="p-1 -mr-1 -mt-1 text-zinc-500 hover:text-zinc-200 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  enqueue,
  getLocalHighlights,
  saveLocalHighlight,
  updateLocalHighlight,
  removeLocalHighlight,
} from "@/lib/offline-queue";

export type Highlight = {
  id: string;
  user_id?: string;
  book_id: string;
  cfi_range: string;
  text?: string;
  color: string;
  note?: string;
  created_at: string;
};

export function useHighlights(bookId: string) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    async function fetchHighlights() {
      if (!bookId) return;

      // 1. Immediately hydrate from local IndexedDB cache (instant offline load)
      try {
        const local = await getLocalHighlights(bookId);
        if (mounted && local.length > 0) {
          setHighlights(
            local.map((lh) => ({
              id: lh.id,
              book_id: lh.bookId,
              cfi_range: lh.cfiRange,
              color: lh.color,
              note: lh.note ?? undefined,
              text: lh.text,
              created_at: lh.createdAt,
            }))
          );
          setLoading(false);
        }
      } catch (err) {
        console.warn("[PageTurn] Failed to read local highlights cache:", err);
      }

      // 2. Fetch authenticated cloud highlights if online
      try {
        const { data: userData } = await supabase.auth.getUser();

        if (!userData.user) {
          const localData = localStorage.getItem(`highlights_${bookId}`);
          if (localData && mounted) {
            try {
              setHighlights(JSON.parse(localData));
            } catch {
              console.error("Failed to parse local highlights");
            }
          }
          if (mounted) setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("highlights")
          .select("*")
          .eq("book_id", bookId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error fetching highlights:", error);
        } else if (data && mounted) {
          setHighlights(data as Highlight[]);
          // Sync cloud highlights to local store
          for (const item of data) {
            await saveLocalHighlight({
              id: item.id,
              bookId: item.book_id,
              cfiRange: item.cfi_range,
              color: item.color,
              note: item.note,
              text: item.text,
              createdAt: item.created_at,
            });
          }
        }
      } catch (err) {
        console.warn("[PageTurn] Network unavailable, staying in offline highlight mode:", err);
      }

      if (mounted) setLoading(false);
    }

    void fetchHighlights();

    return () => {
      mounted = false;
    };
  }, [bookId, supabase]);

  const addHighlight = useCallback(
    async (highlight: Omit<Highlight, "id" | "created_at" | "user_id">) => {
      const newHighlight: Highlight = {
        ...highlight,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };

      // Optimistically update UI
      setHighlights((prev) => [...prev, newHighlight]);

      // Cache locally in IndexedDB
      await saveLocalHighlight({
        id: newHighlight.id,
        bookId,
        cfiRange: newHighlight.cfi_range,
        color: newHighlight.color,
        note: newHighlight.note,
        text: newHighlight.text,
        createdAt: newHighlight.created_at,
      });

      // Enqueue sync mutation (executes immediately if online, or queues if offline)
      await enqueue({
        type: "addHighlight",
        args: {
          id: newHighlight.id,
          bookId,
          cfiRange: newHighlight.cfi_range,
          color: newHighlight.color,
          note: newHighlight.note ?? null,
          text: newHighlight.text,
          createdAt: newHighlight.created_at,
        },
      });

      return newHighlight;
    },
    [bookId]
  );

  const removeHighlight = useCallback(
    async (id: string) => {
      setHighlights((prev) => prev.filter((h) => h.id !== id));
      await removeLocalHighlight(id);

      await enqueue({
        type: "deleteHighlight",
        args: { id, bookId },
      });
    },
    [bookId]
  );

  const updateHighlightNote = useCallback(
    async (id: string, note: string) => {
      setHighlights((prev) =>
        prev.map((h) => (h.id === id ? { ...h, note } : h))
      );

      await updateLocalHighlight(id, { note });

      await enqueue({
        type: "updateHighlight",
        args: { id, bookId, note },
      });
    },
    [bookId]
  );

  return {
    highlights,
    loading,
    addHighlight,
    removeHighlight,
    updateHighlightNote,
  };
}

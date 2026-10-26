import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  enqueue,
  getLocalHighlights,
  getQueue,
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
  note?: string | null;
  created_at: string;
};

function fromLocalHighlight(
  highlight: Awaited<ReturnType<typeof getLocalHighlights>>[number],
): Highlight {
  return {
    id: highlight.id,
    book_id: highlight.bookId,
    cfi_range: highlight.cfiRange,
    color: highlight.color,
    note: highlight.note ?? undefined,
    text: highlight.text,
    created_at: highlight.createdAt,
  };
}

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
          setHighlights(local.map(fromLocalHighlight));
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
          const [queue, local] = await Promise.all([
            getQueue(),
            getLocalHighlights(bookId),
          ]);
          if (!mounted) return;
          const pendingAdds = new Set<string>();
          const pendingUpdates = new Set<string>();
          const pendingDeletes = new Set<string>();

          for (const entry of queue) {
            const action = entry.action;
            if (action.type === "addHighlight" && action.args.bookId === bookId && action.args.id) {
              pendingAdds.add(action.args.id);
            } else if (action.type === "updateHighlight" && action.args.bookId === bookId) {
              pendingUpdates.add(action.args.id);
            } else if (action.type === "deleteHighlight" && action.args.bookId === bookId) {
              pendingDeletes.add(action.args.id);
            }
          }

          const merged = new Map<string, Highlight>(
            (data as Highlight[]).map((item) => [item.id, item]),
          );
          for (const item of local) {
            if (pendingAdds.has(item.id) || pendingUpdates.has(item.id)) {
              merged.set(item.id, fromLocalHighlight(item));
            }
          }
          for (const id of pendingDeletes) merged.delete(id);

          setHighlights(
            [...merged.values()].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            ),
          );

          // Refresh the offline cache without overwriting pending local edits.
          for (const item of data) {
            if (pendingAdds.has(item.id) || pendingUpdates.has(item.id) || pendingDeletes.has(item.id)) {
              continue;
            }
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

  const updateHighlight = useCallback(
    async (id: string, updates: { color?: string; note?: string | null }) => {
      const definedUpdates: { color?: string; note?: string | null } = {};
      if (updates.color !== undefined) definedUpdates.color = updates.color;
      if (updates.note !== undefined) definedUpdates.note = updates.note;

      setHighlights((prev) =>
        prev.map((h) => (h.id === id ? { ...h, ...definedUpdates } : h))
      );

      await updateLocalHighlight(id, definedUpdates);

      await enqueue({
        type: "updateHighlight",
        args: { id, bookId, ...definedUpdates },
      });
    },
    [bookId]
  );

  return {
    highlights,
    loading,
    addHighlight,
    removeHighlight,
    updateHighlight,
  };
}

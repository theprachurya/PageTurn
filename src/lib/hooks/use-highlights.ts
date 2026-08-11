import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

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
  const [isLocalMode, setIsLocalMode] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function fetchHighlights() {
      if (!bookId) return;
      
      const { data: userData } = await supabase.auth.getUser();
      
      // If we are unauthenticated (e.g., in /dev-reader), fallback to local storage
      if (!userData.user) {
        setIsLocalMode(true);
        const localData = localStorage.getItem(`highlights_${bookId}`);
        if (localData && mounted) {
          try {
            setHighlights(JSON.parse(localData));
          } catch (e) {
            console.error("Failed to parse local highlights");
          }
        }
        if (mounted) setLoading(false);
        return;
      }

      // Authenticated flow
      const { data, error } = await supabase
        .from("highlights")
        .select("*")
        .eq("book_id", bookId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching highlights:", error);
      } else if (data && mounted) {
        setHighlights(data as Highlight[]);
      }
      
      if (mounted) setLoading(false);
    }

    fetchHighlights();
    
    return () => {
      mounted = false;
    };
  }, [bookId, supabase]);

  const addHighlight = useCallback(async (
    highlight: Omit<Highlight, "id" | "created_at" | "user_id">
  ) => {
    const newHighlight: Highlight = {
      ...highlight,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    if (isLocalMode) {
      setHighlights((prev) => {
        const next = [...prev, newHighlight];
        localStorage.setItem(`highlights_${bookId}`, JSON.stringify(next));
        return next;
      });
      return newHighlight;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    newHighlight.user_id = userData.user.id;

    // Try inserting to Supabase. If `text` column is missing, this might throw if we send it and it doesn't exist,
    // but typically Postgrest ignores unknown columns if configured, or fails. We should run the migration.
    const { data, error } = await supabase
      .from("highlights")
      .insert(newHighlight)
      .select()
      .single();

    if (error) {
      console.error("Error adding highlight:", error);
      return null;
    }

    if (data) {
      setHighlights((prev) => [...prev, data as Highlight]);
      return data as Highlight;
    }
    return null;
  }, [bookId, isLocalMode, supabase]);

  const removeHighlight = useCallback(async (id: string) => {
    if (isLocalMode) {
      setHighlights((prev) => {
        const next = prev.filter((h) => h.id !== id);
        localStorage.setItem(`highlights_${bookId}`, JSON.stringify(next));
        return next;
      });
      return;
    }

    setHighlights((prev) => prev.filter((h) => h.id !== id));
    
    const { error } = await supabase
      .from("highlights")
      .delete()
      .eq("id", id);
      
    if (error) {
      console.error("Error removing highlight:", error);
    }
  }, [bookId, isLocalMode, supabase]);

  const updateHighlightNote = useCallback(async (id: string, note: string) => {
    if (isLocalMode) {
      setHighlights((prev) => {
        const next = prev.map((h) => (h.id === id ? { ...h, note } : h));
        localStorage.setItem(`highlights_${bookId}`, JSON.stringify(next));
        return next;
      });
      return;
    }

    setHighlights((prev) =>
      prev.map((h) => (h.id === id ? { ...h, note } : h))
    );
    
    const { error } = await supabase
      .from("highlights")
      .update({ note })
      .eq("id", id);
      
    if (error) {
      console.error("Error updating highlight:", error);
    }
  }, [bookId, isLocalMode, supabase]);

  return {
    highlights,
    loading,
    addHighlight,
    removeHighlight,
    updateHighlightNote,
  };
}

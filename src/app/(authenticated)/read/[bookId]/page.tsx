"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EpubReader } from "@/components/reader/epub-reader";
import type { SupabaseClient } from "@supabase/supabase-js";

export default function ReadPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const [epubUrl, setEpubUrl] = useState<string | null>(null);
  const [initialCfi, setInitialCfi] = useState<string | null>(null);
  const [initialProgress, setInitialProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  if (!supabaseRef.current && typeof window !== "undefined") {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current!;

  useEffect(() => {
    loadBook();
  }, [bookId]);

  const loadBook = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      // Fetch book record
      const { data: book, error: bookError } = await supabase
        .from("books")
        .select("*")
        .eq("id", bookId)
        .eq("user_id", user.id)
        .single();

      if (bookError || !book) {
        setError("Book not found");
        setLoading(false);
        return;
      }

      // Generate signed URL for private EPUB file
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from("epubs")
        .createSignedUrl(book.epub_path, 3600); // 1 hour

      if (urlError || !signedUrlData) {
        setError("Could not load EPUB file");
        setLoading(false);
        return;
      }

      // Fetch reading progress
      const { data: userBook } = await supabase
        .from("user_books")
        .select("current_cfi, progress_percentage")
        .eq("user_id", user.id)
        .eq("book_id", bookId)
        .single();

      if (userBook) {
        setInitialCfi(userBook.current_cfi);
        setInitialProgress(Number(userBook.progress_percentage) || 0);
      }

      setEpubUrl(signedUrlData.signedUrl);
      setLoading(false);
    } catch {
      setError("Failed to load book");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Loading your book...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-lg text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.push("/shelf")}
            className="px-4 py-2 rounded-xl bg-purple-100 text-purple-700 text-sm font-medium hover:bg-purple-200 transition-colors cursor-pointer"
          >
            Back to Shelf
          </button>
        </div>
      </div>
    );
  }

  if (!epubUrl) return null;

  return (
    <EpubReader
      bookId={bookId}
      epubUrl={epubUrl}
      initialCfi={initialCfi}
      initialProgress={initialProgress}
    />
  );
}

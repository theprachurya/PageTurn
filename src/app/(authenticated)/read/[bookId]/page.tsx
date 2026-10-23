"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCachedEpub, cacheEpub } from "@/lib/epub-cache";
import { getLocalReadingPosition, resolveConflict } from "@/lib/offline-queue";
import { EpubReader } from "@/components/reader/epub-reader";

export default function ReadPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const [epubUrl, setEpubUrl] = useState<string | ArrayBuffer | null>(null);
  const [initialCfi, setInitialCfi] = useState<string | null>(null);
  const [initialProgress, setInitialProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("Loading your book...");
  const [error, setError] = useState<string | null>(null);

  const loadBook = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      // Cache lookup and reading position are independent after authentication.
      setLoadingStatus("Checking local cache...");
      const [cached, localPosition, userBookRes] = await Promise.all([
        getCachedEpub(bookId),
        getLocalReadingPosition(bookId),
        supabase
          .from("user_books")
          .select("current_cfi, progress_percentage, last_read_at")
          .eq("user_id", user.id)
          .eq("book_id", bookId)
          .single()
          .catch(() => ({ data: null })),
      ]);

      const userBook = userBookRes?.data;

      if (userBook && localPosition) {
        // Resolve between local and remote using Last-Write-Wins
        const resolved = resolveConflict(
          {
            cfi: localPosition.cfi,
            progressPercentage: localPosition.progressPercentage,
            timestamp: localPosition.timestamp,
          },
          {
            cfi: userBook.current_cfi,
            progressPercentage: Number(userBook.progress_percentage) || 0,
            timestamp: userBook.last_read_at || "",
          }
        );
        setInitialCfi(resolved.resolved.cfi);
        setInitialProgress(resolved.resolved.progressPercentage);
      } else if (localPosition) {
        setInitialCfi(localPosition.cfi);
        setInitialProgress(localPosition.progressPercentage);
      } else if (userBook) {
        setInitialCfi(userBook.current_cfi);
        setInitialProgress(Number(userBook.progress_percentage) || 0);
      }

      let arrayBuffer: ArrayBuffer;

      if (cached) {
        setLoadingStatus("Loading from cache...");
        arrayBuffer = cached;
      } else {
        // 2. Fetch book record from Supabase
        setLoadingStatus("Fetching book info...");
        const { data: book, error: bookError } = await supabase
          .from("books")
          .select("epub_path")
          .eq("id", bookId)
          .eq("user_id", user.id)
          .single();

        if (bookError || !book) {
          setError("Book not found");
          setLoading(false);
          return;
        }

        // 3. Download EPUB from Supabase Storage
        setLoadingStatus("Downloading book...");
        const { data: blob, error: downloadError } = await supabase.storage
          .from("epubs")
          .download(book.epub_path);

        if (downloadError || !blob) {
          setError("Could not download EPUB file");
          setLoading(false);
          return;
        }

        arrayBuffer = await blob.arrayBuffer();

        // 4. Cache in IndexedDB for offline use
        setLoadingStatus("Caching for offline...");
        await cacheEpub(bookId, arrayBuffer);
      }

      setEpubUrl(arrayBuffer);
      setLoading(false);
    } catch {
      setError("Failed to load book");
      setLoading(false);
    }
  }, [bookId, router]);

  useEffect(() => {
    let ignore = false;
    async function run() {
      if (!ignore) await loadBook();
    }
    void run();
    return () => {
      ignore = true;
    };
  }, [loadBook]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#08080a]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-zinc-800 border-t-gold-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-zinc-500">{loadingStatus}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#08080a]">
        <div className="text-center">
          <p className="text-lg text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push("/shelf")}
            className="px-5 py-2.5 rounded-lg bg-gold-500/10 text-gold-400 text-sm font-medium hover:bg-gold-500/15 transition-colors cursor-pointer border border-gold-500/20"
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

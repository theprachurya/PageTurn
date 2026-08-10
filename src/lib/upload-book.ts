import { createClient } from "@/lib/supabase/client";
import type { ExtractedBookData } from "@/lib/epub-utils";

export interface BookRecord {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  description: string | null;
  cover_url: string | null;
  epub_path: string;
  created_at: string;
}

/**
 * Uploads an EPUB + cover to Supabase Storage and inserts metadata into the database.
 * - Covers go to a public bucket (for easy <img> rendering)
 * - EPUBs go to a private bucket (secure, requires signed URLs)
 */
export async function uploadBookToSupabase(
  extractedData: ExtractedBookData,
  userId: string
): Promise<BookRecord> {
  const supabase = createClient();
  const { title, author, description, coverBlob, originalFile } = extractedData;

  const uniqueId = crypto.randomUUID();
  const epubFilePath = `${userId}/${uniqueId}.epub`;
  const coverFilePath = coverBlob ? `${userId}/${uniqueId}-cover.jpg` : null;

  try {
    // Upload EPUB to private bucket
    const { data: epubData, error: epubError } = await supabase.storage
      .from("epubs")
      .upload(epubFilePath, originalFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (epubError) throw new Error(`EPUB Upload failed: ${epubError.message}`);

    // Upload Cover to public bucket
    let finalCoverUrl: string | null = null;

    if (coverBlob && coverFilePath) {
      const { error: coverError } = await supabase.storage
        .from("covers")
        .upload(coverFilePath, coverBlob, {
          contentType: coverBlob.type || "image/jpeg",
          upsert: false,
        });

      if (coverError)
        throw new Error(`Cover Upload failed: ${coverError.message}`);

      const { data: publicUrlData } = supabase.storage
        .from("covers")
        .getPublicUrl(coverFilePath);

      finalCoverUrl = publicUrlData.publicUrl;
    }

    // Insert book metadata into database
    const { data: bookRecord, error: dbError } = await supabase
      .from("books")
      .insert({
        user_id: userId,
        title,
        author,
        description,
        cover_url: finalCoverUrl,
        epub_path: epubData.path,
      })
      .select()
      .single();

    if (dbError)
      throw new Error(`Database insert failed: ${dbError.message}`);

    // Auto-create user_books record
    await supabase.from("user_books").insert({
      user_id: userId,
      book_id: bookRecord.id,
      status: "reading",
    });

    return bookRecord as BookRecord;
  } catch (error) {
    console.error("Upload process failed:", error);
    throw error;
  }
}

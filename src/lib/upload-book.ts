import { createClient } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";
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

// ─── Constants ─────────────────────────────────────────────────

const MAX_FILE_SIZE_MB = 100;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;
const COVER_MAX_WIDTH_PX = 600;

// ─── Validation ────────────────────────────────────────────────

export function validateEpubFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".epub")) {
    return "Please select an .epub file";
  }

  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > MAX_FILE_SIZE_MB) {
    return `File is too large (${sizeMb.toFixed(1)} MB). Maximum is ${MAX_FILE_SIZE_MB} MB.`;
  }

  return null;
}

/**
 * Check if an EPUB is DRM-protected by looking for encryption.xml in the ZIP.
 * Returns true if DRM is detected.
 */
export async function checkForDrm(file: File): Promise<boolean> {
  try {
    // Dynamically import JSZip (already a transitive dep of epubjs)
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(file);

    const encryptionFile = zip.file("META-INF/encryption.xml");
    if (!encryptionFile) return false;

    const content = await encryptionFile.async("text");
    // If encryption.xml exists and references EncryptedData, it's DRM
    return content.includes("EncryptedData");
  } catch {
    // If we can't parse the ZIP at all, it might be corrupted
    return false;
  }
}

// ─── Cover compression ────────────────────────────────────────

async function compressCover(coverBlob: Blob): Promise<Blob> {
  try {
    // Convert Blob to File for the compression library
    const file = new File([coverBlob], "cover.jpg", { type: coverBlob.type || "image/jpeg" });
    
    const compressed = await imageCompression(file, {
      maxWidthOrHeight: COVER_MAX_WIDTH_PX,
      maxSizeMB: 0.3,
      useWebWorker: true,
      fileType: "image/jpeg",
    });
    
    return compressed;
  } catch (err) {
    console.warn("Cover compression failed, using original:", err);
    return coverBlob;
  }
}

// ─── Retry with backoff ───────────────────────────────────────

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unreachable");
}

// ─── Upload with progress ─────────────────────────────────────

export type UploadStage = "validating" | "uploading_epub" | "uploading_cover" | "saving_metadata" | "done";

export interface UploadProgress {
  stage: UploadStage;
  percentage: number;
}

/**
 * Uploads an EPUB + cover to Supabase Storage and inserts metadata into the database.
 * - Covers go to a public bucket (for easy <img> rendering)
 * - EPUBs go to a private bucket (secure, requires signed URLs)
 * - Covers are compressed to max 600px width before upload
 * - Uploads use retry-with-backoff for resilience
 */
export async function uploadBookToSupabase(
  extractedData: ExtractedBookData,
  userId: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<BookRecord> {
  const supabase = createClient();
  const { title, author, description, coverBlob, originalFile } = extractedData;

  const uniqueId = crypto.randomUUID();
  const epubFilePath = `${userId}/${uniqueId}.epub`;
  const coverFilePath = coverBlob ? `${userId}/${uniqueId}-cover.jpg` : null;

  // Stage: Upload EPUB (50% of total progress)
  onProgress?.({ stage: "uploading_epub", percentage: 10 });

  const { data: epubData } = await retryWithBackoff(async () => {
    const result = await supabase.storage
      .from("epubs")
      .upload(epubFilePath, originalFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (result.error) throw new Error(`EPUB Upload failed: ${result.error.message}`);
    return result;
  });

  onProgress?.({ stage: "uploading_epub", percentage: 50 });

  // Stage: Upload Cover (30% of total progress)
  let finalCoverUrl: string | null = null;

  if (coverBlob && coverFilePath) {
    onProgress?.({ stage: "uploading_cover", percentage: 55 });

    // Compress cover before upload
    const compressedCover = await compressCover(coverBlob);

    await retryWithBackoff(async () => {
      const { error: coverError } = await supabase.storage
        .from("covers")
        .upload(coverFilePath, compressedCover, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (coverError) throw new Error(`Cover Upload failed: ${coverError.message}`);
    });

    const { data: publicUrlData } = supabase.storage
      .from("covers")
      .getPublicUrl(coverFilePath);

    finalCoverUrl = publicUrlData.publicUrl;
  }

  onProgress?.({ stage: "saving_metadata", percentage: 80 });

  // Stage: Insert metadata (20% of total progress)
  // TODO: If this insert fails, the EPUB and cover files uploaded above become
  // orphaned in Supabase Storage. Consider a cleanup cron or wrapping the
  // entire upload in a transaction-like pattern that deletes uploaded files on failure.
  const { data: bookRecord, error: dbError } = await supabase
    .from("books")
    .insert({
      user_id: userId,
      title,
      author,
      description,
      cover_url: finalCoverUrl,
      epub_path: epubData!.path,
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

  onProgress?.({ stage: "done", percentage: 100 });

  return bookRecord as BookRecord;
}

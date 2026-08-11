import ePub from "epubjs";
import imageCompression from "browser-image-compression";

export interface ExtractedBookData {
  title: string;
  author: string;
  description: string;
  coverBlob: Blob | null;
  originalFile: File;
}

/**
 * Extracts metadata and cover image from an EPUB File object.
 */
export async function extractEpubMetadata(
  file: File
): Promise<ExtractedBookData> {
  const arrayBuffer = await file.arrayBuffer();
  const book = ePub(arrayBuffer);

  try {
    const metadata = await book.loaded.metadata;
    const coverPath = await book.loaded.cover;

    let coverBlob: Blob | null = null;

    if (coverPath) {
      try {
        const coverUrl = await book.archive.createUrl(coverPath);
        const response = await fetch(coverUrl);
        const originalBlob = await response.blob();
        URL.revokeObjectURL(coverUrl);

        // Compress the image before returning
        const imageFile = new File([originalBlob], "cover.jpg", { type: originalBlob.type || "image/jpeg" });
        const compressedFile = await imageCompression(imageFile, {
          maxSizeMB: 0.2, // Compress to max 200KB
          maxWidthOrHeight: 600, // Max 600px dimension
          useWebWorker: true
        });
        coverBlob = compressedFile;
      } catch (err) {
        console.warn("Could not extract and compress cover image", err);
      }
    }

    return {
      title: metadata.title || "Unknown Title",
      author: metadata.creator || "Unknown Author",
      description: metadata.description || "",
      coverBlob,
      originalFile: file,
    };
  } catch (error) {
    console.error("Failed to parse EPUB file:", error);
    throw new Error("Invalid EPUB file");
  } finally {
    book.destroy();
  }
}

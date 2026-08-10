import ePub from "epubjs";

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
        coverBlob = await response.blob();
        URL.revokeObjectURL(coverUrl);
      } catch {
        console.warn("Could not extract cover image");
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

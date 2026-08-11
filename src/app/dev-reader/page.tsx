"use client";

import { useState, useEffect } from "react";
import { EpubReader } from "@/components/reader/epub-reader";

export default function DevReaderPage() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    // Just point it directly to the local file we copied to public/test.epub
    setFileUrl("/test.epub");
  }, []);

  if (!fileUrl) {
    return <div className="flex h-screen items-center justify-center">Loading dev reader...</div>;
  }

  return (
    <div className="h-screen w-screen bg-slate-50">
        <EpubReader
          epubUrl="/dev-book.epub"
          bookId="dev-book"
          initialCfi=""
        />
    </div>
  );
}

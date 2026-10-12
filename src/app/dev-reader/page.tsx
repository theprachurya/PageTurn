"use client";

import { EpubReader } from "@/components/reader/epub-reader";

export default function DevReaderPage() {

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

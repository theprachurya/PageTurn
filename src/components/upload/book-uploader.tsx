"use client";

import { useState, useRef } from "react";
import { Upload, X, BookOpen, Loader2 } from "lucide-react";
import { extractEpubMetadata, type ExtractedBookData } from "@/lib/epub-utils";
import { uploadBookToSupabase } from "@/lib/upload-book";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface BookUploaderProps {
  onUploadComplete?: () => void;
}

export function BookUploader({ onUploadComplete }: BookUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [bookData, setBookData] = useState<ExtractedBookData | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setBookData(null);
    setCoverPreview(null);
    setError(null);
    setIsExtracting(false);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    setIsOpen(false);
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".epub")) {
      setError("Please select an .epub file");
      return;
    }

    setError(null);
    setIsExtracting(true);

    try {
      const extracted = await extractEpubMetadata(file);
      setBookData(extracted);

      if (extracted.coverBlob) {
        const previewUrl = URL.createObjectURL(extracted.coverBlob);
        setCoverPreview(previewUrl);
      }
    } catch {
      setError("Could not read this EPUB file. It may be corrupted or DRM-protected.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleUpload = async () => {
    if (!bookData) return;

    setIsUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      await uploadBookToSupabase(bookData, user.id);
      handleClose();
      onUploadComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-lavender-600 text-white font-medium text-sm shadow-lg shadow-purple-200/50 hover:shadow-purple-300/50 hover:scale-105 transition-all duration-300 cursor-pointer"
      >
        <Upload className="w-4 h-4" />
        Upload Book
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Upload Book</h2>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {!bookData ? (
              /* Drop Zone */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300",
                  isDragging
                    ? "border-purple-400 bg-purple-50"
                    : "border-purple-200 hover:border-purple-300 hover:bg-purple-50/50"
                )}
              >
                {isExtracting ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                    <p className="text-sm text-purple-500">
                      Extracting metadata...
                    </p>
                  </div>
                ) : (
                  <>
                    <BookOpen className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                    <p className="text-sm text-slate-600 mb-2">
                      Drag & drop your .epub file here
                    </p>
                    <p className="text-xs text-slate-400 mb-4">or</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-purple-100 text-purple-700 text-sm font-medium hover:bg-purple-200 transition-colors cursor-pointer"
                    >
                      Browse Files
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".epub"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </>
                )}
              </div>
            ) : (
              /* Preview */
              <div className="flex gap-4">
                <div className="w-28 h-40 rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 to-lavender-100 flex-shrink-0">
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-purple-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 truncate">
                    {bookData.title}
                  </h3>
                  <p className="text-sm text-slate-500 mb-1">{bookData.author}</p>
                  {bookData.description && (
                    <p className="text-xs text-slate-400 line-clamp-3">
                      {bookData.description}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={reset}
                      className="px-3 py-1.5 rounded-lg border border-purple-200 text-purple-600 text-xs font-medium hover:bg-purple-50 transition-colors cursor-pointer"
                    >
                      Change
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-lavender-600 text-white text-xs font-medium disabled:opacity-50 hover:opacity-90 transition-all cursor-pointer"
                    >
                      {isUploading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Upload className="w-3 h-3" />
                      )}
                      {isUploading ? "Uploading..." : "Upload"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

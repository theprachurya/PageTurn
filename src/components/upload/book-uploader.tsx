"use client";

import { useState, useRef } from "react";
import { Upload, X, BookOpen, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { extractEpubMetadata, type ExtractedBookData } from "@/lib/epub-utils";
import {
  uploadBookToSupabase,
  validateEpubFile,
  checkForDrm,
  type UploadProgress,
  type UploadStage,
} from "@/lib/upload-book";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface BookUploaderProps {
  onUploadComplete?: () => void;
}

const STAGE_LABELS: Record<UploadStage, string> = {
  validating: "Validating file...",
  uploading_epub: "Uploading EPUB...",
  uploading_cover: "Uploading cover...",
  saving_metadata: "Saving metadata...",
  done: "Done!",
};

export function BookUploader({ onUploadComplete }: BookUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [bookData, setBookData] = useState<ExtractedBookData | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setBookData(null);
    setCoverPreview(null);
    setError(null);
    setIsExtracting(false);
    setIsUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    setIsOpen(false);
  };

  const handleFile = async (file: File) => {
    setError(null);

    const validationError = validateEpubFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsExtracting(true);
    try {
      const isDrm = await checkForDrm(file);
      if (isDrm) {
        setError("This EPUB file appears to be DRM-protected. PageTurn cannot open DRM-protected books.");
        setIsExtracting(false);
        return;
      }
    } catch {
      // Continue
    }

    try {
      const extracted = await extractEpubMetadata(file);
      setBookData(extracted);

      if (extracted.coverBlob) {
        const previewUrl = URL.createObjectURL(extracted.coverBlob);
        setCoverPreview(previewUrl);
      }
    } catch {
      setError("Could not read this EPUB file. It may be corrupted.");
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
    setUploadProgress({ stage: "validating", percentage: 0 });

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      await uploadBookToSupabase(bookData, user.id, setUploadProgress);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      handleClose();
      onUploadComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-medium text-sm shadow-lg shadow-red-950/60 hover:shadow-red-800/40 hover:scale-[1.02] transition-all duration-300 cursor-pointer border border-red-500/30"
      >
        <Upload className="w-4 h-4" />
        Upload Book
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-md animate-fade-in"
            onClick={handleClose}
          />

          <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-slide-up text-zinc-100 z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-100">Upload Book</h2>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
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
                    ? "border-red-500 bg-red-950/30"
                    : "border-zinc-800 hover:border-red-900/60 hover:bg-zinc-950/50"
                )}
              >
                {isExtracting ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
                    <p className="text-sm text-red-400">
                      Checking file & extracting metadata...
                    </p>
                  </div>
                ) : (
                  <>
                    <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-sm text-zinc-300 mb-1 font-medium">
                      Drag & drop your .epub file here
                    </p>
                    <p className="text-xs text-zinc-500 mb-4">Max 100 MB · No DRM</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 text-sm font-medium hover:bg-zinc-700 hover:text-white transition-colors cursor-pointer"
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
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-28 h-40 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 flex-shrink-0">
                    {coverPreview ? (
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-10 h-10 text-zinc-700" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-zinc-100 truncate">
                      {bookData.title}
                    </h3>
                    <p className="text-sm text-zinc-400 mb-1">{bookData.author}</p>
                    {bookData.description && (
                      <p className="text-xs text-zinc-500 line-clamp-3">
                        {bookData.description}
                      </p>
                    )}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={reset}
                        disabled={isUploading}
                        className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 text-xs font-medium hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Change
                      </button>
                      <button
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-medium disabled:opacity-50 hover:opacity-90 transition-all cursor-pointer shadow-md shadow-red-950/50"
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

                {/* Upload Progress Bar */}
                {uploadProgress && isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">
                        {STAGE_LABELS[uploadProgress.stage]}
                      </span>
                      <span className="text-xs font-mono text-red-400 font-semibold">
                        {uploadProgress.percentage}%
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${uploadProgress.percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-950/50 border border-red-900/60 text-sm text-red-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}


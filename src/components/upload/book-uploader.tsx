"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, BookOpen, Loader2, AlertTriangle, ShieldCheck, FileText } from "lucide-react";
import { extractEpubMetadata, type ExtractedBookData } from "@/lib/epub-utils";
import {
  uploadBookToSupabase,
  validateEpubFile,
  checkForDrm,
  type UploadProgress,
  type UploadStage,
} from "@/lib/upload-book";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface BookUploaderProps {
  onUploadComplete?: () => void;
  isOpenExternally?: boolean;
  onCloseExternal?: () => void;
}

const STAGE_LABELS: Record<UploadStage, string> = {
  validating: "Validating EPUB integrity...",
  uploading_epub: "Encrypting & streaming document...",
  uploading_cover: "Extracting & optimizing cover art...",
  saving_metadata: "Syncing library metadata...",
  done: "Import Complete!",
};

export function BookUploader({
  onUploadComplete,
  isOpenExternally,
  onCloseExternal,
}: BookUploaderProps) {
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isModalOpen = isOpenExternally !== undefined ? isOpenExternally : isOpenInternal;

  const [isDragging, setIsDragging] = useState(false);
  const [bookData, setBookData] = useState<ExtractedBookData | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }
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
    if (onCloseExternal) {
      onCloseExternal();
    } else {
      setIsOpenInternal(false);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);

    const validationError = validateEpubFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError, "Invalid Document");
      return;
    }

    setIsExtracting(true);
    try {
      const isDrm = await checkForDrm(file);
      if (isDrm) {
        const msg = "This EPUB file appears to be DRM-protected. PageTurn cannot open DRM-protected books.";
        setError(msg);
        toast.error(msg, "DRM Protected");
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
        if (coverPreview) {
          URL.revokeObjectURL(coverPreview);
        }
        const previewUrl = URL.createObjectURL(extracted.coverBlob);
        setCoverPreview(previewUrl);
      }
    } catch {
      const msg = "Could not parse EPUB structure. The file may be damaged.";
      setError(msg);
      toast.error(msg, "Extraction Error");
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

      await uploadBookToSupabase(bookData, user.id, setUploadProgress);
      await new Promise((resolve) => setTimeout(resolve, 600));

      toast.success(`"${bookData.title}" has been added to your library.`, "Import Successful");
      handleClose();
      onUploadComplete?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed. Please try again.";
      setError(msg);
      toast.error(msg, "Upload Failed");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  return (
    <>
      {/* Optional inline button trigger if not externally rendered */}
      {isOpenExternally === undefined && (
        <button
          onClick={() => setIsOpenInternal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 active:scale-95 text-zinc-950 font-semibold text-xs tracking-tight transition-all duration-200 cursor-pointer shadow-sm"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload EPUB</span>
        </button>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            className="absolute inset-0"
            onClick={handleClose}
          />

          <div className="relative bg-[#14171b] border border-white/10 rounded-2xl shadow-2xl shadow-black/80 max-w-lg w-full p-6 animate-in zoom-in-95 duration-150 text-zinc-100 z-10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-gold-400 tracking-widest uppercase px-2 py-0.5 rounded bg-gold-500/10 border border-gold-500/20">
                  DOC • IMPORT
                </span>
                <h2 id="upload-modal-title" className="text-base font-bold text-zinc-100">
                  Add Document
                </h2>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
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
                  "relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 overflow-hidden",
                  isDragging
                    ? "border-gold-400 bg-gold-500/[0.06] scale-[1.01]"
                    : "border-white/10 hover:border-gold-500/30 hover:bg-white/[0.02]"
                )}
              >
                {/* Background dot matrix */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                />

                {isExtracting ? (
                  <div className="relative z-10 flex flex-col items-center gap-3 py-4">
                    <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
                    <div>
                      <p className="text-xs font-mono font-medium text-gold-400 tracking-wide uppercase">
                        Extracting Metadata
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Parsing chapters, typography, and cover art...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 mb-4 shadow-sm group-hover:text-gold-400">
                      <FileText className="w-6 h-6 text-gold-400/90" />
                    </div>
                    <p className="text-sm text-zinc-100 font-semibold mb-1">
                      Drag & drop your EPUB file here
                    </p>
                    <p className="text-xs text-zinc-500 mb-5 font-mono">
                      .epub format · Up to 100 MB · DRM-free
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-100 text-xs font-medium border border-white/10 transition-all active:scale-95 cursor-pointer"
                    >
                      Browse Local Files
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".epub"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-4 text-[10px] font-mono text-zinc-500">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Private Storage
                      </span>
                      <span>•</span>
                      <span>Offline Cached</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Preview */
              <div className="space-y-4">
                <div className="flex gap-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="w-20 h-28 rounded-lg overflow-hidden bg-black/40 border border-white/10 flex-shrink-0 relative shadow-md">
                    {coverPreview ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <BookOpen className="w-7 h-7" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-zinc-100 truncate">
                        {bookData.title}
                      </h3>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {bookData.author || "Unknown Author"}
                      </p>
                      {bookData.description && (
                        <p className="text-[11px] text-zinc-500 line-clamp-2 mt-1.5 leading-relaxed">
                          {bookData.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={reset}
                        disabled={isUploading}
                        className="px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-zinc-200 text-xs font-medium hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        Change
                      </button>
                      <button
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="flex-1 flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg bg-gold-500 text-zinc-950 text-xs font-bold disabled:opacity-40 hover:bg-gold-400 transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        {isUploading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>{isUploading ? "Importing Document..." : "Import to Library"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                {uploadProgress && isUploading && (
                  <div className="space-y-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-mono text-[11px]">
                        {STAGE_LABELS[uploadProgress.stage]}
                      </span>
                      <span className="font-mono text-gold-400 font-bold">
                        {uploadProgress.percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-gold-400 transition-all duration-300 ease-out rounded-full shadow-[0_0_10px_rgba(216,255,62,0.5)]"
                        style={{ width: `${uploadProgress.percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-start gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

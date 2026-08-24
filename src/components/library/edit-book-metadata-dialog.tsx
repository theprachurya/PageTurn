"use client";

import { useEffect, useState } from "react";
import { BookOpen, Image, Loader2, Save, X } from "lucide-react";
import { updateBookMetadata, type BookMetadata } from "@/app/actions/library.actions";

interface EditBookMetadataDialogProps {
  bookId: string;
  initialMetadata: BookMetadata;
  onClose: () => void;
  onSaved: (metadata: BookMetadata) => void;
}

export function EditBookMetadataDialog({
  bookId,
  initialMetadata,
  onClose,
  onSaved,
}: EditBookMetadataDialogProps) {
  const [metadata, setMetadata] = useState<BookMetadata>(initialMetadata);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  const setField = (field: keyof BookMetadata, value: string) => {
    setMetadata((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await updateBookMetadata(bookId, metadata);
      onSaved({
        title: metadata.title.trim(),
        author: metadata.author.trim(),
        description: metadata.description.trim(),
        cover_url: metadata.cover_url.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update book metadata");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#1f1f23] bg-[#111113] shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500/8 text-gold-500">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-100">Edit Book Metadata</h2>
              <p className="text-xs text-zinc-500">Update how this book appears in your library.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Title *</label>
            <input
              required
              value={metadata.title}
              onChange={(event) => setField("title", event.target.value)}
              className="w-full rounded-lg border border-[#1f1f23] bg-[#08080a] px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-gold-500/40"
              placeholder="Book title"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Author</label>
            <input
              value={metadata.author}
              onChange={(event) => setField("author", event.target.value)}
              className="w-full rounded-lg border border-[#1f1f23] bg-[#08080a] px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-gold-500/40"
              placeholder="Author name"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Description</label>
            <textarea
              value={metadata.description}
              onChange={(event) => setField("description", event.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-[#1f1f23] bg-[#08080a] px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-gold-500/40"
              placeholder="Book description"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Cover URL</label>
            <div className="relative">
              <Image className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                type="url"
                value={metadata.cover_url}
                onChange={(event) => setField("cover_url", event.target.value)}
                className="w-full rounded-lg border border-[#1f1f23] bg-[#08080a] py-2.5 pl-9 pr-3.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-gold-500/40"
                placeholder="https://example.com/cover.jpg"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-900/40 bg-red-950/30 px-3.5 py-2.5 text-sm text-red-400/80">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-zinc-800/40 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-zinc-800/60 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800/40 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !metadata.title.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

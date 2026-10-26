"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Bookmark, Download, Highlighter, LoaderCircle, MessageSquareText, NotebookPen, Search } from "lucide-react";
import { getReadingNotebook } from "@/app/actions/reader.actions";

type NotebookEntry = Awaited<ReturnType<typeof getReadingNotebook>>[number];
type NotebookFilter = "all" | "highlights" | "notes" | "bookmarks";

const filters: { id: NotebookFilter; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "highlights", label: "Highlights" },
  { id: "notes", label: "Notes" },
  { id: "bookmarks", label: "Bookmarks" },
];

function exportNotebook(entries: NotebookEntry[]) {
  const grouped = new Map<string, NotebookEntry[]>();
  for (const entry of entries) {
    const group = grouped.get(entry.bookId) || [];
    group.push(entry);
    grouped.set(entry.bookId, group);
  }

  const lines = ["# PageTurn notebook", "", `Exported ${new Date().toLocaleDateString()}.`, ""];
  for (const bookEntries of grouped.values()) {
    lines.push(`## ${bookEntries[0].bookTitle}`, "");
    for (const entry of bookEntries) {
      const date = new Date(entry.createdAt).toLocaleDateString();
      if (entry.kind === "bookmark") {
        lines.push(`- **Bookmark · ${date}** — ${entry.label}`, "");
      } else {
        if (entry.text) lines.push(`> ${entry.text.replaceAll("\n", "\n> ")}`, "");
        if (entry.note) lines.push(`**Note:** ${entry.note}`, "");
        if (!entry.note && !entry.text) lines.push(`- Highlight · ${date}`, "");
      }
    }
  }

  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `pageturn-notebook-${new Date().toISOString().slice(0, 10)}.md`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function NotebookPage() {
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<NotebookFilter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    getReadingNotebook()
      .then((data) => { if (!cancelled) setEntries(data); })
      .catch((cause) => {
        console.error("Could not load the notebook", cause);
        if (!cancelled) setError(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => ({
    highlights: entries.filter((entry) => entry.kind === "highlight").length,
    notes: entries.filter((entry) => entry.kind === "highlight" && Boolean(entry.note.trim())).length,
    bookmarks: entries.filter((entry) => entry.kind === "bookmark").length,
  }), [entries]);

  const visibleEntries = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return entries.filter((entry) => {
      if (filter === "highlights" && entry.kind !== "highlight") return false;
      if (filter === "notes" && (entry.kind !== "highlight" || !entry.note.trim())) return false;
      if (filter === "bookmarks" && entry.kind !== "bookmark") return false;
      if (!search) return true;
      return [entry.bookTitle, entry.author || "", entry.text, entry.note, entry.label]
        .some((value) => value.toLocaleLowerCase().includes(search));
    });
  }, [entries, filter, query]);

  return (
    <div className="notebook-page mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-10">
      <header className="notebook-header flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="today-eyebrow">Across all your books</p>
          <h1 className="mt-2 text-[32px] font-semibold leading-tight sm:text-[38px]">Notebook</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">A searchable record of the lines you kept, thoughts you added, and places to return to.</p>
        </div>
        <button type="button" className="notebook-export" onClick={() => exportNotebook(entries)} disabled={!entries.length}>
          <Download className="h-4 w-4" /> Export Markdown
        </button>
      </header>

      <section className="notebook-summary mt-7 grid grid-cols-3 divide-x rounded-xl border bg-white">
        <div><Highlighter className="h-4 w-4" /><span>Highlights</span><strong>{counts.highlights}</strong></div>
        <div><MessageSquareText className="h-4 w-4" /><span>Notes</span><strong>{counts.notes}</strong></div>
        <div><Bookmark className="h-4 w-4" /><span>Bookmarks</span><strong>{counts.bookmarks}</strong></div>
      </section>

      <section className="mt-8">
        <div className="notebook-controls flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="notebook-filters flex items-center gap-1 overflow-x-auto rounded-lg border bg-white p-1" role="group" aria-label="Filter notebook entries">
            {filters.map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} data-active={filter === item.id ? "true" : undefined}>
              {item.label}<span>{item.id === "all" ? entries.length : counts[item.id]}</span>
            </button>)}
          </div>
          <label className="notebook-search flex h-10 items-center gap-2 rounded-lg border bg-white px-3">
            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
            <input aria-label="Search your notebook" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search books, passages, notes" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400" />
          </label>
        </div>

        <div className="mt-4">
          {loading ? <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-zinc-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Gathering your notes</div>
            : error ? <div className="notebook-empty"><p className="font-medium">Your notebook couldn’t be opened.</p><p className="mt-1 text-sm text-zinc-500">Try refreshing the page in a moment.</p></div>
            : visibleEntries.length ? <div className="notebook-entries">
              {visibleEntries.map((entry) => <article key={`${entry.kind}-${entry.id}`} className="notebook-entry">
                <div className="notebook-entry-cover">
                  {entry.coverUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- Cover URLs are user-scoped storage URLs and are not allowlisted for Next image optimization. */
                    <img src={entry.coverUrl} alt="" loading="lazy" decoding="async" />
                  ) : <BookOpen className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="notebook-entry-meta"><span>{entry.bookTitle}</span><i>·</i><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time></div>
                  {entry.kind === "bookmark" ? <p className="notebook-bookmark-title"><Bookmark className="h-4 w-4" />{entry.label}</p> : <>
                    {entry.text ? <blockquote className="notebook-quote" style={{ borderLeftColor: entry.color || "#d5b85d" }}>{entry.text}</blockquote> : <p className="notebook-muted-entry"><Highlighter className="h-4 w-4" /> Highlighted passage</p>}
                    {entry.note && <p className="notebook-note"><MessageSquareText className="mt-0.5 h-4 w-4 shrink-0" /><span>{entry.note}</span></p>}
                  </>}
                  <p className="notebook-author">{entry.author || "Author not listed"}</p>
                </div>
                <Link href={`/read/${entry.bookId}?cfi=${encodeURIComponent(entry.cfi)}`} className="notebook-return" aria-label={`Return to ${entry.bookTitle}`} title="Return to this place in the book">Return to page <BookOpen className="h-4 w-4" /></Link>
              </article>)}
            </div> : <div className="notebook-empty">
              <div className="today-empty-icon"><NotebookPen className="h-5 w-5" /></div>
              <h2 className="mt-4 text-lg font-semibold">{entries.length ? "No entries match this view." : "A place for the lines you keep."}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">{entries.length ? "Try another filter or search term." : "Highlight a passage or add a bookmark while reading. Your notes from every book will appear here."}</p>
              {!entries.length && <Link href="/library" className="today-text-link mt-5">Open your library <BookOpen className="h-4 w-4" /></Link>}
            </div>}
        </div>
      </section>
    </div>
  );
}

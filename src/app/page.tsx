"use client";

import { useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  BookOpen,
  CloudOff,
  LineChart,
  RefreshCw,
  Type,
  Upload,
} from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

export default function LandingPage() {
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  };

  const handleSignIn = async () => {
    const supabase = getSupabase();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#17201b] font-sans text-zinc-50 antialiased selection:bg-gold-500/20 selection:text-gold-200 app-landing">
      <nav className="landing-nav fixed top-0 z-50 w-full border-b border-white/10 bg-[#17201b]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <a href="#top" className="flex items-center gap-2.5" aria-label="PageTurn home">
            <span className="brand-mark"><BookOpen className="h-4 w-4" /></span>
            <span className="text-lg font-semibold tracking-tight text-zinc-100">
              Page<span className="text-gold-500">Turn</span>
            </span>
          </a>
          <div className="hidden items-center gap-7 md:flex">
            <a className="landing-nav-link" href="#reader">Reading</a>
            <a className="landing-nav-link" href="#sync">Sync</a>
            <a className="landing-nav-link" href="#offline">Offline</a>
          </div>
          <button onClick={handleSignIn} className="landing-nav-cta">
            Open your library <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>

      <main id="top" className="pt-20">
        <section className="landing-hero mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 md:min-h-[620px] md:grid-cols-[1fr_.9fr] md:gap-16 md:py-20">
          <div className="landing-copy">
            <p className="landing-kicker"><span />A personal EPUB library and reader</p>
            <h1 className="landing-title">
              Keep your place in <em>every book.</em>
            </h1>
            <p className="landing-lede">
              Your books, notes, shelves and reading sessions stay together. Read offline,
              then pick up where you left off on another device.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={handleSignIn} className="landing-primary">
                Start reading <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={handleSignIn} className="landing-secondary">
                <Upload className="h-4 w-4" /> Add an EPUB
              </button>
            </div>
            <p className="landing-caption"><span />A quiet reading space, wherever you are.</p>
          </div>

          <div className="book-stage" aria-hidden="true">
            <div className="book-stage-label"><span>PageTurn · Reader view</span><span>01 / 04</span></div>
            <div className="book-composition">
              <div className="cover-back cover-back-one" />
              <div className="cover-back cover-back-two" />
              <div className="book-spread">
                <div className="book-cover-art">
                  <span className="cover-kicker">A small collection</span>
                  <span className="cover-title">The<br />Quiet<br /><i>Hour</i></span>
                  <span className="cover-author">Stories for a slower day</span>
                  <span className="cover-circle" />
                </div>
                <div className="book-page-art">
                  <span className="page-running-head">Chapter IV <span>43%</span></span>
                  <h2>A little more room to think.</h2>
                  <p>The afternoon held its breath. Outside, a line of rain moved slowly over the hills.</p>
                  <div className="page-lines"><i /><i /><i /><i /><i /><i /></div>
                  <span className="page-number">— 86 —</span>
                </div>
              </div>
            </div>
            <div className="book-stage-foot"><span>Progress saved</span><span className="sync-mark"><i /> Ready to read offline</span></div>
          </div>
        </section>

        <section id="features" className="features-section mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-24">
          <div className="features-heading">
            <div>
              <p className="section-label text-gold-500/80">A reading system, thoughtfully made</p>
              <h2>Room to read.<br /><span>Everything in its place.</span></h2>
            </div>
            <p>Keep the small parts of reading together, so returning to a book feels effortless.</p>
          </div>
          <div className="feature-grid">
            <article id="reader" className="feature-card feature-card-wide">
              <div className="feature-card-top"><span>01</span><Type className="h-5 w-5" /></div>
              <h3>Settle into the page</h3>
              <p>Read EPUBs with adjustable typography, precise highlights, bookmarks and a built-in dictionary.</p>
              <span className="feature-rule" />
              <span className="feature-foot">READER · NOTES · BOOKMARKS</span>
            </article>
            <article id="sync" className="feature-card">
              <div className="feature-card-top"><span>02</span><RefreshCw className="h-5 w-5" /></div>
              <h3>Pick up where you left off</h3>
              <p>Reading position and annotations follow your account across devices.</p>
              <span className="feature-foot">REALTIME SYNC</span>
            </article>
            <article id="offline" className="feature-card">
              <div className="feature-card-top"><span>03</span><CloudOff className="h-5 w-5" /></div>
              <h3>Keep your books close</h3>
              <p>Cache EPUBs locally and keep a small queue of changes ready for reconnection.</p>
              <span className="feature-foot">OFFLINE FIRST</span>
            </article>
            <article id="analytics" className="feature-card feature-card-wide">
              <div className="feature-card-top"><span>04</span><LineChart className="h-5 w-5" /></div>
              <h3>Notice your reading rhythm</h3>
              <p>Reading sessions, history and statistics make it easier to see how a habit is taking shape.</p>
              <span className="feature-rule" />
              <span className="feature-foot">SESSIONS · HISTORY · STATS</span>
            </article>
          </div>
        </section>
      </main>

      <footer className="landing-footer border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-5 py-7 sm:flex-row sm:items-center sm:px-8">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-4 w-4 text-gold-500" />
            <span className="text-sm font-semibold text-zinc-300">PageTurn</span>
          </div>
          <a className="landing-nav-link" href="#top">Back to the beginning ↑</a>
          <span className="text-xs text-zinc-500">© {new Date().getFullYear()} PageTurn</span>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  CloudOff,
  LineChart,
  RefreshCw,
  Upload,
  ArrowRight,
  Type
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
    <div className="min-h-screen bg-[#08080a] text-zinc-100 selection:bg-gold-500/20 selection:text-gold-200 overflow-x-hidden font-sans antialiased">
      {/* Top Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#08080a]/80 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="flex justify-between items-center px-8 md:px-10 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-gold-500" />
            <span className="text-lg font-semibold tracking-tight text-zinc-100">
              Page<span className="text-gold-500">Turn</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            <a className="text-zinc-500 hover:text-zinc-200 transition-all text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-zinc-800/50" href="#features">Features</a>
            <a className="text-zinc-500 hover:text-zinc-200 transition-all text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-zinc-800/50" href="#features">Sync</a>
            <a className="text-zinc-500 hover:text-zinc-200 transition-all text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-zinc-800/50" href="#features">Analytics</a>
          </div>
          <button
            onClick={handleSignIn}
            className="bg-gold-500 text-zinc-950 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gold-400 transition-colors active:scale-[0.97] duration-200"
          >
            Start Reading
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-28 pb-24">
        {/* Hero Section */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 min-h-[75vh] flex flex-col justify-center items-center text-center">
          {/* Background Atmospheric Effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-[-1]">
            <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-gold-500/[0.04] rounded-full blur-[120px]"></div>
            <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-zinc-700/[0.06] rounded-full blur-[100px]"></div>
          </div>

          <div className="mb-6">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-gold-500/80 bg-gold-500/[0.06] px-4 py-1.5 rounded-full border border-gold-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" />
              Now in Open Beta
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-500 mb-6 max-w-4xl leading-[1.08] tracking-tight font-serif">
            Your Personal
            <br />
            <span className="gradient-text-gold">Reading Sanctuary</span>
          </h1>

          <p className="text-base md:text-lg text-zinc-500 max-w-xl mx-auto mb-10 leading-relaxed">
            Manage, sync, and immerse yourself in your EPUB library with unparalleled ease. Designed for focus, engineered for readers.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center w-full">
            <button
              onClick={handleSignIn}
              className="bg-gold-500 text-zinc-950 px-8 py-3.5 rounded-xl text-sm font-semibold hover:bg-gold-400 transition-all active:scale-[0.97] duration-200 flex items-center gap-2.5 shadow-[0_0_20px_rgba(212,168,83,0.15)]"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleSignIn}
              className="glass text-zinc-300 px-8 py-3.5 rounded-xl text-sm font-medium hover:bg-white/[0.04] transition-all active:scale-[0.97] duration-200 flex items-center gap-2.5"
            >
              <Upload className="w-4 h-4" />
              Upload Book
            </button>
          </div>
          
          {/* Hero Image/Graphic Representation */}
          <div className="mt-20 w-full max-w-5xl mx-auto relative rounded-2xl overflow-hidden border border-white/[0.06] glass aspect-video shadow-2xl shadow-black/40">
            <div 
              className="bg-cover bg-center w-full h-full absolute inset-0 opacity-70 mix-blend-screen"
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544928147-79a2dbc1f389?q=80&w=2000&auto=format&fit=crop')" }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-[#08080a]/50 to-transparent"></div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-28 relative z-10">
          <div className="text-center mb-16">
            <p className="section-label text-gold-500/70 mb-3">What's Inside</p>
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-100 tracking-tight">Engineered for Readers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Feature 1: Rendering (Large) */}
            <div className="card rounded-2xl p-8 lg:col-span-2 flex flex-col justify-between group overflow-hidden relative min-h-[280px] hover:-translate-y-0.5 transition-all duration-300 hover:border-gold-500/20">
              <div className="absolute right-0 top-0 w-64 h-64 bg-gold-500/[0.03] rounded-bl-full blur-3xl transition-all duration-500 group-hover:bg-gold-500/[0.06]"></div>
              <div className="relative z-10">
                <Type className="text-gold-500 w-8 h-8 mb-6 opacity-80" />
                <h3 className="text-xl font-semibold text-zinc-100 mb-2">EPUB Rendering</h3>
                <p className="text-zinc-500 text-sm leading-relaxed max-w-md">Crystal clear reading experience with advanced typography controls and flawless formatting preservation.</p>
              </div>
            </div>
            {/* Feature 2: Sync */}
            <div className="card rounded-2xl p-8 flex flex-col justify-between group overflow-hidden relative min-h-[280px] hover:-translate-y-0.5 transition-all duration-300 hover:border-gold-500/20">
              <div className="relative z-10">
                <RefreshCw className="text-gold-500 w-8 h-8 mb-6 opacity-80" />
                <h3 className="text-xl font-semibold text-zinc-100 mb-2">Realtime Sync</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">Your library, everywhere. Seamlessly pick up right where you left off on any device.</p>
              </div>
            </div>
            {/* Feature 3: Offline */}
            <div className="card rounded-2xl p-8 flex flex-col justify-between group overflow-hidden relative min-h-[280px] hover:-translate-y-0.5 transition-all duration-300 hover:border-gold-500/20">
              <div className="relative z-10">
                <CloudOff className="text-gold-500 w-8 h-8 mb-6 opacity-80" />
                <h3 className="text-xl font-semibold text-zinc-100 mb-2">Offline Access</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">Read anytime, anywhere. Full local storage ensures your books are available without a connection.</p>
              </div>
            </div>
            {/* Feature 4: Analytics (Large) */}
            <div className="card rounded-2xl p-8 lg:col-span-2 flex flex-col justify-between group overflow-hidden relative min-h-[280px] hover:-translate-y-0.5 transition-all duration-300 hover:border-gold-500/20">
              <div className="absolute left-0 bottom-0 w-64 h-64 bg-gold-500/[0.03] rounded-tr-full blur-3xl transition-all duration-500 group-hover:bg-gold-500/[0.06]"></div>
              <div className="relative z-10">
                <LineChart className="text-gold-500 w-8 h-8 mb-6 opacity-80" />
                <h3 className="text-xl font-semibold text-zinc-100 mb-2">Analytics</h3>
                <p className="text-zinc-500 text-sm leading-relaxed max-w-md">Deep insights into your reading habits. Track your pace, completion rates, and daily streaks.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#08080a] w-full py-10 border-t border-white/[0.04]">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 max-w-7xl mx-auto gap-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gold-500" />
            <span className="text-sm font-semibold text-zinc-400">
              Page<span className="text-gold-500">Turn</span>
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <a className="text-xs font-medium text-zinc-600 hover:text-gold-500 transition-colors" href="#">Privacy Policy</a>
            <a className="text-xs font-medium text-zinc-600 hover:text-gold-500 transition-colors" href="#">Terms of Service</a>
            <a className="text-xs font-medium text-zinc-600 hover:text-gold-500 transition-colors" href="#">Help Center</a>
          </div>
          <div className="text-xs text-zinc-700">
            &copy; {new Date().getFullYear()} PageTurn
          </div>
        </div>
      </footer>
    </div>
  );
}

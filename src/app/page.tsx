"use client";

import { useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  CloudOff,
  LineChart,
  RefreshCw,
  Upload,
  Play,
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
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-red-500/30 selection:text-red-200 overflow-x-hidden font-sans antialiased">
      {/* Top Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex justify-between items-center px-8 md:px-10 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-red-600" />
            <span className="text-xl font-bold tracking-tight text-zinc-100">
              Page<span className="text-red-500">Turn</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a className="text-zinc-400 hover:text-zinc-100 transition-all text-sm font-medium hover:bg-red-500/10 hover:text-red-500 px-3 py-1.5 rounded-md" href="#">Features</a>
            <a className="text-zinc-400 hover:text-zinc-100 transition-all text-sm font-medium hover:bg-red-500/10 hover:text-red-500 px-3 py-1.5 rounded-md" href="#">Library</a>
            <a className="text-zinc-400 hover:text-zinc-100 transition-all text-sm font-medium hover:bg-red-500/10 hover:text-red-500 px-3 py-1.5 rounded-md" href="#">Sync</a>
            <a className="text-zinc-400 hover:text-zinc-100 transition-all text-sm font-medium hover:bg-red-500/10 hover:text-red-500 px-3 py-1.5 rounded-md" href="#">Analytics</a>
          </div>
          <button
            onClick={handleSignIn}
            className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-red-500 transition-colors active:scale-95 duration-200 shadow-lg shadow-red-900/20"
          >
            Start Reading
          </button>
        </div>
      </nav>

      {/* Main Content Canvas */}
      <main className="pt-32 pb-24">
        {/* Hero Section */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 min-h-[70vh] flex flex-col justify-center items-center text-center">
          {/* Background Atmospheric Effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-[-1]">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-zinc-800/20 rounded-full blur-[80px]"></div>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400 mb-6 max-w-4xl leading-tight tracking-tight">
            Your Personal Reading Sanctuary
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Manage, sync, and immerse yourself in your EPUB library with unparalleled ease. Designed for focus, engineered for performance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full">
            <button
              onClick={handleSignIn}
              className="bg-red-600 text-white px-8 py-4 rounded-xl text-sm font-semibold hover:bg-red-500 transition-all active:scale-95 duration-200 flex items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
            >
              <Play className="w-5 h-5 fill-current" />
              Start Reading
            </button>
            <button
              onClick={handleSignIn}
              className="glass text-zinc-100 px-8 py-4 rounded-xl text-sm font-semibold hover:bg-white/5 transition-all active:scale-95 duration-200 flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Upload Book
            </button>
          </div>
          
          {/* Hero Image/Graphic Representation */}
          <div className="mt-20 w-full max-w-5xl mx-auto relative rounded-2xl overflow-hidden border border-white/10 glass aspect-video shadow-2xl">
            <div 
              className="bg-cover bg-center w-full h-full absolute inset-0 opacity-80 mix-blend-screen"
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544928147-79a2dbc1f389?q=80&w=2000&auto=format&fit=crop')" }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/50 to-transparent"></div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-24 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-4 tracking-tight">Engineered for Readers</h2>
            <p className="text-zinc-400 text-lg">Everything you need for an immersive experience.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Rendering (Large) */}
            <div className="glass-card rounded-2xl p-8 lg:col-span-2 flex flex-col justify-between group overflow-hidden relative min-h-[300px] hover:-translate-y-1 transition-all duration-300">
              <div className="absolute right-0 top-0 w-64 h-64 bg-red-600/5 rounded-bl-full blur-3xl transition-all duration-500 group-hover:bg-red-600/10"></div>
              <div className="relative z-10">
                <Type className="text-red-500 w-10 h-10 mb-6" />
                <h3 className="text-2xl font-bold text-zinc-100 mb-2">EPUB Rendering</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">Crystal clear reading experience with advanced typography controls and flawless formatting preservation.</p>
              </div>
            </div>
            {/* Feature 2: Sync */}
            <div className="glass-card rounded-2xl p-8 flex flex-col justify-between group overflow-hidden relative min-h-[300px] hover:-translate-y-1 transition-all duration-300">
              <div className="relative z-10">
                <RefreshCw className="text-red-500 w-10 h-10 mb-6" />
                <h3 className="text-2xl font-bold text-zinc-100 mb-2">Realtime Sync</h3>
                <p className="text-zinc-400 leading-relaxed">Your library, everywhere. Seamlessly pick up right where you left off on any device.</p>
              </div>
            </div>
            {/* Feature 3: Offline */}
            <div className="glass-card rounded-2xl p-8 flex flex-col justify-between group overflow-hidden relative min-h-[300px] hover:-translate-y-1 transition-all duration-300">
              <div className="relative z-10">
                <CloudOff className="text-red-500 w-10 h-10 mb-6" />
                <h3 className="text-2xl font-bold text-zinc-100 mb-2">Offline Access</h3>
                <p className="text-zinc-400 leading-relaxed">Read anytime, anywhere. Full local storage ensures your books are available without a connection.</p>
              </div>
            </div>
            {/* Feature 4: Analytics (Large) */}
            <div className="glass-card rounded-2xl p-8 lg:col-span-2 flex flex-col justify-between group overflow-hidden relative min-h-[300px] hover:-translate-y-1 transition-all duration-300">
              <div className="absolute left-0 bottom-0 w-64 h-64 bg-red-600/5 rounded-tr-full blur-3xl transition-all duration-500 group-hover:bg-red-600/10"></div>
              <div className="relative z-10">
                <LineChart className="text-red-500 w-10 h-10 mb-6" />
                <h3 className="text-2xl font-bold text-zinc-100 mb-2">Analytics</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">Deep insights into your reading habits. Track your pace, completion rates, and daily streaks.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#0e0e10] w-full py-12 border-t border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 max-w-7xl mx-auto gap-8">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-red-600" />
            <span className="text-lg font-bold text-zinc-100">Page<span className="text-red-500">Turn</span></span>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <a className="text-xs font-semibold tracking-wider text-zinc-500 hover:text-red-500 transition-colors uppercase" href="#">Privacy Policy</a>
            <a className="text-xs font-semibold tracking-wider text-zinc-500 hover:text-red-500 transition-colors uppercase" href="#">Terms of Service</a>
            <a className="text-xs font-semibold tracking-wider text-zinc-500 hover:text-red-500 transition-colors uppercase" href="#">Help Center</a>
            <a className="text-xs font-semibold tracking-wider text-zinc-500 hover:text-red-500 transition-colors uppercase" href="#">Contact</a>
          </div>
          <div className="text-xs font-semibold text-zinc-600 tracking-wide uppercase">
            &copy; {new Date().getFullYear()} PageTurn. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

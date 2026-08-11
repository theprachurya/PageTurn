"use client";

import { useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  Sparkles,
  BarChart3,
  Smartphone,
  ArrowRight,
  BookMarked,
  Clock,
  TrendingUp,
  Flame,
  ShieldCheck,
  Zap,
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
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-red-500/30 selection:text-red-200 overflow-hidden font-sans">
      {/* Ambient background lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-red-950/20 rounded-full blur-[150px] animate-float" />
        <div
          className="absolute top-1/3 -right-20 w-[500px] h-[500px] bg-rose-950/15 rounded-full blur-[160px]"
          style={{ animationDelay: "1s", animation: "float 6s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-10 left-10 w-[550px] h-[550px] bg-red-900/10 rounded-full blur-[140px]"
          style={{ animationDelay: "2s", animation: "float 5s ease-in-out infinite" }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6 border-b border-zinc-800/50 backdrop-blur-md bg-zinc-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-950/50">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-100">
            Page<span className="text-red-500">Turn</span>
          </span>
        </div>
        <button
          onClick={handleSignIn}
          className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-sm font-medium text-zinc-200 transition-all duration-200 hover:border-red-500/50 hover:text-white cursor-pointer shadow-md"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10">
        <section className="max-w-6xl mx-auto px-6 md:px-12 pt-16 md:pt-28 pb-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-950/40 border border-red-800/40 text-red-400 text-xs font-semibold uppercase tracking-wider mb-8 animate-fade-in shadow-inner">
              <Flame className="w-4 h-4 text-red-500 animate-pulse" />
              Crimson Edition • Distraction-free reading sanctuary
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6 animate-slide-up">
              Read deeper.{" "}
              <span className="gradient-text">Track every page.</span>
            </h1>

            <p
              className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              Upload your EPUB files, customize fonts and themes, and build a consistent reading habit with streaks, goals, and precise analytics.
            </p>

            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <button
                onClick={handleSignIn}
                className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 via-crimson-600 to-rose-600 text-white font-semibold text-lg shadow-xl shadow-red-950/60 hover:shadow-red-700/40 transition-all duration-300 hover:scale-[1.02] flex items-center gap-3 cursor-pointer border border-red-500/30"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-red-200" />
              </button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-6xl mx-auto px-6 md:px-12 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: BookMarked,
                title: "Personal Library",
                description:
                  "Upload EPUBs effortlessly. Organize your collection with tags, shelves, and grid views.",
              },
              {
                icon: Sparkles,
                title: "Distraction-Free Reader",
                description:
                  "Custom themes, typography, and optional Publisher CSS override for clean reading.",
              },
              {
                icon: Clock,
                title: "Real-time Sync",
                description:
                  "Never lose your place. Reading progress syncs seamlessly across all your devices.",
              },
              {
                icon: TrendingUp,
                title: "Streaks & Analytics",
                description:
                  "Track daily reading habits with GitHub-style heatmaps, WPM estimates, and goals.",
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-red-600/40 transition-all duration-300 hover:-translate-y-1 backdrop-blur-md"
                style={{ animationDelay: `${0.1 * i + 0.3}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-red-950/40 border border-red-900/40 flex items-center justify-center mb-4 group-hover:bg-red-600/20 group-hover:border-red-500/40 transition-colors">
                  <feature.icon className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-zinc-100">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="max-w-4xl mx-auto px-6 md:px-12 py-12">
          <div className="bg-zinc-900/70 border border-zinc-800/90 rounded-3xl p-8 md:p-10 backdrop-blur-xl shadow-2xl">
            <div className="grid grid-cols-3 gap-8 text-center divide-x divide-zinc-800">
              {[
                { value: "∞", label: "EPUBs Supported" },
                { value: "100%", label: "Free & Private" },
                { value: "24/7", label: "Cloud Sync" },
              ].map((stat) => (
                <div key={stat.label} className="first:pl-0 pl-4">
                  <div className="text-3xl md:text-4xl font-extrabold text-red-500 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-xs uppercase tracking-wider font-semibold text-zinc-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Device Sync Showcase */}
        <section className="max-w-6xl mx-auto px-6 md:px-12 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-zinc-100">
              Read on <span className="text-red-500">any screen</span>
            </h2>
            <p className="text-zinc-400 max-w-lg mx-auto text-sm">
              Your reading position and annotations stay in sync whether you are on desktop or mobile.
            </p>
          </div>
          <div className="flex justify-center gap-8 items-end">
            <div className="hidden md:block w-72 h-80 rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 shadow-xl animate-float">
              <div className="w-full h-4 bg-red-950/60 rounded mb-3 border border-red-900/30" />
              <div className="w-3/4 h-3 bg-zinc-800 rounded mb-6" />
              <div className="space-y-2.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-full h-2 bg-zinc-800/60 rounded" />
                ))}
              </div>
            </div>
            <div
              className="w-52 h-72 rounded-3xl bg-zinc-900/90 border border-red-900/40 p-5 flex flex-col shadow-2xl shadow-red-950/40 animate-float"
              style={{ animationDelay: "0.5s" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-4 h-4 text-red-500" />
                <div className="w-16 h-2 bg-red-950/60 rounded" />
              </div>
              <div className="space-y-2 flex-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-full h-2 bg-zinc-800 rounded" />
                ))}
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-4 overflow-hidden">
                <div className="w-3/4 h-full bg-red-600 rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-4xl mx-auto px-6 md:px-12 py-16">
          <div className="text-center bg-gradient-to-b from-zinc-900 to-zinc-950 border border-red-900/30 rounded-3xl p-10 md:p-14 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-60 h-60 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
            <BarChart3 className="w-12 h-12 text-red-500 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-zinc-100">
              Start building your reading habit today
            </h2>
            <p className="text-zinc-400 mb-8 max-w-md mx-auto text-sm">
              Join readers who track their progress, set daily goals, and never lose their place.
            </p>
            <button
              onClick={handleSignIn}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold shadow-xl shadow-red-950/80 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            >
              Get Started — It&apos;s Free
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="max-w-6xl mx-auto px-6 md:px-12 py-8 border-t border-zinc-800/60">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <BookOpen className="w-4 h-4 text-red-500" />
              <span>PageTurn Crimson Edition &copy; {new Date().getFullYear()}</span>
            </div>
            <p className="text-zinc-500 text-sm">
              Built with precision for avid readers
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}


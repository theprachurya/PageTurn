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
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-[#1a0a2e] to-[#0f0a1a] text-white overflow-hidden">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-[100px] animate-float" />
        <div
          className="absolute top-60 right-20 w-96 h-96 bg-lavender-500/15 rounded-full blur-[120px]"
          style={{ animationDelay: "1s", animation: "float 4s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px]"
          style={{ animationDelay: "2s", animation: "float 5s ease-in-out infinite" }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-lavender-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">PageTurn</span>
        </div>
        <button
          onClick={handleSignIn}
          className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-medium transition-all duration-300 hover:scale-105 cursor-pointer"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10">
        <section className="max-w-6xl mx-auto px-6 md:px-12 pt-16 md:pt-28 pb-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              Your personal reading sanctuary
            </div>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 animate-slide-up">
              Read without{" "}
              <span className="gradient-text">distractions.</span>
              <br />
              Track your{" "}
              <span className="gradient-text">progress.</span>
            </h1>

            <p
              className="text-lg md:text-xl text-purple-200/70 mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              Upload your EPUB files, customize your reading experience, and
              build a consistent reading habit with streaks, goals, and
              beautiful analytics.
            </p>

            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <button
                onClick={handleSignIn}
                className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-lavender-600 text-white font-semibold text-lg shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 hover:scale-105 flex items-center gap-3 cursor-pointer"
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
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-6xl mx-auto px-6 md:px-12 py-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: BookMarked,
                title: "Your Library",
                description:
                  "Upload EPUBs and organize your collection. Beautiful grid and list views.",
                gradient: "from-purple-500/20 to-purple-600/5",
              },
              {
                icon: Sparkles,
                title: "Custom Reader",
                description:
                  "Adjust fonts, themes, and disable publisher CSS for distraction-free reading.",
                gradient: "from-lavender-500/20 to-lavender-600/5",
              },
              {
                icon: Clock,
                title: "Progress Sync",
                description:
                  "Never lose your place. Your reading position is saved automatically.",
                gradient: "from-purple-400/20 to-purple-500/5",
              },
              {
                icon: TrendingUp,
                title: "Reading Streaks",
                description:
                  "Track daily goals and build streaks with a GitHub-style heatmap.",
                gradient: "from-lavender-400/20 to-lavender-500/5",
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className={`group p-6 rounded-2xl bg-gradient-to-b ${feature.gradient} border border-white/5 hover:border-purple-500/30 transition-all duration-500 hover:-translate-y-1 animate-slide-up`}
                style={{ animationDelay: `${0.1 * i + 0.3}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-purple-200/60 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="max-w-4xl mx-auto px-6 md:px-12 py-16">
          <div className="glass rounded-3xl p-8 md:p-12">
            <div className="grid grid-cols-3 gap-8 text-center">
              {[
                { value: "∞", label: "Books Supported" },
                { value: "100%", label: "Free & Private" },
                { value: "24/7", label: "Cloud Sync" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-purple-200/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mobile Preview Section */}
        <section className="max-w-6xl mx-auto px-6 md:px-12 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Read on <span className="gradient-text">any device</span>
            </h2>
            <p className="text-purple-200/60 max-w-lg mx-auto">
              Your library syncs seamlessly across all your devices. Start
              reading on your laptop, continue on your phone.
            </p>
          </div>
          <div className="flex justify-center gap-8 items-end">
            <div className="hidden md:block w-64 h-80 rounded-2xl bg-gradient-to-b from-purple-500/10 to-purple-600/5 border border-white/5 p-6 animate-float">
              <div className="w-full h-4 bg-purple-500/20 rounded mb-3" />
              <div className="w-3/4 h-4 bg-purple-500/15 rounded mb-6" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="w-full h-2.5 bg-purple-500/10 rounded"
                  />
                ))}
              </div>
            </div>
            <div
              className="w-48 h-72 rounded-3xl bg-gradient-to-b from-lavender-500/15 to-lavender-600/5 border border-white/10 p-5 flex flex-col animate-float"
              style={{ animationDelay: "0.5s" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-4 h-4 text-purple-400" />
                <div className="w-16 h-2 bg-purple-500/20 rounded" />
              </div>
              <div className="space-y-2 flex-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-full h-2 bg-purple-500/10 rounded"
                  />
                ))}
              </div>
              <div className="w-full h-1 bg-purple-500/30 rounded-full mt-4">
                <div className="w-2/3 h-full bg-gradient-to-r from-purple-400 to-lavender-500 rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-4xl mx-auto px-6 md:px-12 py-20">
          <div className="text-center glass rounded-3xl p-12 animate-pulse-glow">
            <BarChart3 className="w-12 h-12 text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Start building your reading habit today
            </h2>
            <p className="text-purple-200/60 mb-8 max-w-lg mx-auto">
              Join readers who track their progress, set daily goals, and never
              lose their place in a book again.
            </p>
            <button
              onClick={handleSignIn}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-lavender-600 text-white font-semibold shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 hover:scale-105 cursor-pointer"
            >
              Get Started — It&apos;s Free
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="max-w-6xl mx-auto px-6 md:px-12 py-8 border-t border-white/5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-purple-200/40 text-sm">
              <BookOpen className="w-4 h-4" />
              <span>PageTurn &copy; {new Date().getFullYear()}</span>
            </div>
            <p className="text-purple-200/30 text-sm">
              Built with ♥ for book lovers
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

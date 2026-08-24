"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Flame,
  BookCheck,
  Clock,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { StreakHeatmap } from "@/components/history/streak-heatmap";
import { DailyGoalRing } from "@/components/history/daily-goal-ring";
import { formatDistanceToNow } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";

interface Session {
  id: string;
  book_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  chapter_name: string | null;
  books: {
    title: string;
    author: string | null;
    cover_url: string | null;
  };
}

export default function HistoryPage() {
  const [sessionsByDate, setSessionsByDate] = useState<Record<string, number>>(
    {}
  );
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(60);
  const [streak, setStreak] = useState(0);
  const [totalBooksRead, setTotalBooksRead] = useState(0);
  const [currentlyReading, setCurrentlyReading] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  if (!supabaseRef.current && typeof window !== "undefined") {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current!;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [
      profileResult,
      sessionsResult,
      recentResult,
      completedCountResult,
      readingCountResult
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("daily_goal_minutes")
        .eq("id", user.id)
        .single(),

      supabase
        .from("reading_sessions")
        .select("session_date, duration_minutes")
        .eq("user_id", user.id)
        .order("session_date", { ascending: false }),

      supabase
        .from("reading_sessions")
        .select(
          `
          id,
          book_id,
          session_date,
          start_time,
          end_time,
          duration_minutes,
          chapter_name,
          books (
            title,
            author,
            cover_url
          )
        `
        )
        .eq("user_id", user.id)
        .order("start_time", { ascending: false })
        .limit(20),

      supabase
        .from("user_books")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed"),

      supabase
        .from("user_books")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "reading")
    ]);

    if (profileResult.data) setDailyGoal(profileResult.data.daily_goal_minutes);

    if (sessionsResult.data) {
      const byDate: Record<string, number> = {};
      sessionsResult.data.forEach(
        (s: { session_date: string; duration_minutes: number }) => {
          byDate[s.session_date] =
            (byDate[s.session_date] || 0) + s.duration_minutes;
        }
      );
      setSessionsByDate(byDate);

      const today = new Date().toISOString().split("T")[0];
      setTodayMinutes(byDate[today] || 0);

      let currentStreak = 0;
      const d = new Date();
      while (true) {
        const dateStr = d.toISOString().split("T")[0];
        if (byDate[dateStr] && byDate[dateStr] > 0) {
          currentStreak++;
          d.setDate(d.getDate() - 1);
        } else {
          break;
        }
      }
      setStreak(currentStreak);
    }

    if (recentResult.data) setRecentSessions(recentResult.data as unknown as Session[]);

    setTotalBooksRead(completedCountResult.count || 0);
    setCurrentlyReading(readingCountResult.count || 0);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 border-2 border-zinc-800 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 text-zinc-100">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">
          Reading History
        </h1>
        <p className="text-zinc-500 text-sm">Track your reading journey & streaks</p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Daily Goal Card */}
        <div className="card rounded-xl border-gold-500/15 p-6 text-zinc-100">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-gold-500" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
              Daily Goal
            </span>
          </div>
          <DailyGoalRing
            currentMinutes={todayMinutes}
            goalMinutes={dailyGoal}
          />
          <p className="text-center text-xs text-zinc-500 mt-3">
            {todayMinutes >= dailyGoal
              ? "🎉 Goal reached!"
              : `${dailyGoal - todayMinutes} min remaining`}
          </p>
        </div>

        {/* Reading Streak Card */}
        <div className="card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-gold-500/8 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 text-gold-500" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
              Reading Streak
            </span>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-3xl font-bold text-zinc-100">{streak}</span>
            <span className="text-xs text-zinc-600 font-mono">days</span>
          </div>
          <p className="text-xs text-zinc-500">
            {streak > 0
              ? "Keep the flame alive! 🔥"
              : "Start reading today to build a streak"}
          </p>
        </div>

        {/* Books Read Card */}
        <div className="card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-800/60 flex items-center justify-center">
              <BookCheck className="w-3.5 h-3.5 text-gold-400" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
              Books Read
            </span>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-3xl font-bold text-zinc-100">
              {totalBooksRead}
            </span>
            <span className="text-xs text-zinc-600 font-mono">completed</span>
          </div>
          <p className="text-xs text-zinc-500">
            {currentlyReading} currently reading
          </p>
        </div>
      </div>

      {/* Heatmap Card */}
      <div className="card rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-4 h-4 text-gold-500" />
          <h2 className="text-base font-semibold text-zinc-100">
            Reading Activity
          </h2>
        </div>
        <StreakHeatmap sessionsByDate={sessionsByDate} />
      </div>

      {/* Recent Sessions */}
      <div className="card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-gold-500" />
          <h2 className="text-base font-semibold text-zinc-100">
            Recent Sessions
          </h2>
        </div>

        {recentSessions.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
            <p className="text-sm text-zinc-600">
              No reading sessions yet. Open a book to start tracking!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-800/30 transition-colors border border-transparent hover:border-zinc-800/50"
              >
                {/* Book cover */}
                <div className="w-9 h-13 rounded-md overflow-hidden bg-zinc-950 border border-zinc-800/60 flex-shrink-0">
                  {session.books?.cover_url ? (
                    <img
                      src={session.books.cover_url}
                      alt={session.books.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-950">
                      <BookOpen className="w-3.5 h-3.5 text-zinc-700" />
                    </div>
                  )}
                </div>

                {/* Session info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-zinc-200 truncate">
                    {session.books?.title || "Unknown Book"}
                  </h4>
                  {session.chapter_name && (
                    <p className="text-xs text-zinc-600 truncate">
                      {session.chapter_name}
                    </p>
                  )}
                </div>

                {/* Duration & time */}
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-gold-500 font-mono">
                    {session.duration_minutes} min
                  </div>
                  <div className="text-[11px] text-zinc-600">
                    {formatDistanceToNow(new Date(session.start_time), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

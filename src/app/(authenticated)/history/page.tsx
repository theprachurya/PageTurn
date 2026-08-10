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

    // Fetch profile for daily goal
    const { data: profile } = await supabase
      .from("profiles")
      .select("daily_goal_minutes")
      .eq("id", user.id)
      .single();

    if (profile) setDailyGoal(profile.daily_goal_minutes);

    // Fetch all sessions for heatmap
    const { data: sessions } = await supabase
      .from("reading_sessions")
      .select("session_date, duration_minutes")
      .eq("user_id", user.id)
      .order("session_date", { ascending: false });

    if (sessions) {
      const byDate: Record<string, number> = {};
      sessions.forEach(
        (s: { session_date: string; duration_minutes: number }) => {
          byDate[s.session_date] =
            (byDate[s.session_date] || 0) + s.duration_minutes;
        }
      );
      setSessionsByDate(byDate);

      // Today's minutes
      const today = new Date().toISOString().split("T")[0];
      setTodayMinutes(byDate[today] || 0);

      // Calculate streak
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

    // Fetch recent sessions with book info
    const { data: recent } = await supabase
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
      .limit(20);

    if (recent) setRecentSessions(recent as unknown as Session[]);

    // Fetch book counts
    const { count: completedCount } = await supabase
      .from("user_books")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "completed");

    const { count: readingCount } = await supabase
      .from("user_books")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "reading");

    setTotalBooksRead(completedCount || 0);
    setCurrentlyReading(readingCount || 0);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-1">
          Reading History
        </h1>
        <p className="text-slate-500">Track your reading journey</p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Daily Goal Card */}
        <div className="rounded-3xl bg-gradient-to-br from-purple-700 via-purple-800 to-purple-950 p-6 text-white shadow-xl shadow-purple-200/30">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-purple-300" />
            <span className="text-sm font-medium text-purple-200">
              Daily Goal
            </span>
          </div>
          <DailyGoalRing
            currentMinutes={todayMinutes}
            goalMinutes={dailyGoal}
          />
          <p className="text-center text-xs text-purple-300 mt-3">
            {todayMinutes >= dailyGoal
              ? "🎉 Goal reached!"
              : `${dailyGoal - todayMinutes} min remaining`}
          </p>
        </div>

        {/* Reading Streak Card */}
        <div className="rounded-3xl bg-white border border-purple-100/50 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <span className="text-sm font-medium text-slate-600">
              Reading Streak
            </span>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-bold text-slate-800">{streak}</span>
            <span className="text-sm text-slate-400">days</span>
          </div>
          <p className="text-xs text-slate-400">
            {streak > 0
              ? "Keep it going! 🔥"
              : "Start reading today to build a streak"}
          </p>
        </div>

        {/* Books Read Card */}
        <div className="rounded-3xl bg-white border border-purple-100/50 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <BookCheck className="w-4 h-4 text-purple-500" />
            </div>
            <span className="text-sm font-medium text-slate-600">
              Books Read
            </span>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-bold text-slate-800">
              {totalBooksRead}
            </span>
            <span className="text-sm text-slate-400">completed</span>
          </div>
          <p className="text-xs text-slate-400">
            {currentlyReading} currently reading
          </p>
        </div>
      </div>

      {/* Heatmap Card */}
      <div className="rounded-3xl bg-white border border-purple-100/50 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-slate-800">
            Reading Activity
          </h2>
        </div>
        <StreakHeatmap sessionsByDate={sessionsByDate} />
      </div>

      {/* Recent Sessions */}
      <div className="rounded-3xl bg-white border border-purple-100/50 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-slate-800">
            Recent Sessions
          </h2>
        </div>

        {recentSessions.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-10 h-10 text-purple-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              No reading sessions yet. Open a book to start tracking!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-purple-50/50 transition-colors"
              >
                {/* Book cover */}
                <div className="w-10 h-14 rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 to-lavender-100 flex-shrink-0">
                  {session.books?.cover_url ? (
                    <img
                      src={session.books.cover_url}
                      alt={session.books.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-purple-300" />
                    </div>
                  )}
                </div>

                {/* Session info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-slate-800 truncate">
                    {session.books?.title || "Unknown Book"}
                  </h4>
                  {session.chapter_name && (
                    <p className="text-xs text-slate-400 truncate">
                      {session.chapter_name}
                    </p>
                  )}
                </div>

                {/* Duration & time */}
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-medium text-purple-600">
                    {session.duration_minutes} min
                  </div>
                  <div className="text-xs text-slate-400">
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

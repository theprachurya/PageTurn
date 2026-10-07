"use server";

import { requireUser } from "@/lib/supabase/require-user";
import { differenceInCalendarDays } from "date-fns";

export interface DailyStats {
  date: string;
  minutes: number;
  words: number;
}

export interface StatsData {
  totalMinutes: number;
  totalWords: number;
  booksCompleted: number;
  currentStreak: number;
  longestStreak: number;
  dailyStats: DailyStats[]; // Selected chart range
}

export type StatsRange = "30" | "90" | "year" | "all";

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export async function getStats(range: StatsRange = "30"): Promise<StatsData> {
  const { supabase, user } = await requireUser();
  const selectedRange: StatsRange = ["30", "90", "year", "all"].includes(range) ? range : "30";

  // 1. Fetch all reading sessions
  const { data: sessions } = await supabase
    .from("reading_sessions")
    .select("session_date, duration_minutes, words_read")
    .eq("user_id", user.id)
    .order("session_date", { ascending: true });

  // 2. Fetch completed books count
  const { count: booksCompleted } = await supabase
    .from("user_books")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "completed");

  const stats: StatsData = {
    totalMinutes: 0,
    totalWords: 0,
    booksCompleted: booksCompleted || 0,
    currentStreak: 0,
    longestStreak: 0,
    dailyStats: []
  };

  // Aggregate by date
  const dateMap = new Map<string, DailyStats>();
  for (const session of sessions || []) {
    const date = session.session_date;
    stats.totalMinutes += session.duration_minutes || 0;
    stats.totalWords += session.words_read || 0;
    
    if (dateMap.has(date)) {
      const existing = dateMap.get(date)!;
      existing.minutes += session.duration_minutes || 0;
      existing.words += session.words_read || 0;
    } else {
      dateMap.set(date, { date, minutes: session.duration_minutes || 0, words: session.words_read || 0 });
    }
  }

  // Calculate streaks using date-fns to avoid DST edge cases
  const dates = Array.from(dateMap.keys()).sort(); // YYYY-MM-DD string sorting
  
  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;

  for (const dateStr of dates) {
    // Parse as local date (YYYY-MM-DD → midnight local)
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    
    if (!lastDate) {
      tempStreak = 1;
    } else {
      const diffDays = differenceInCalendarDays(date, lastDate);
      
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
      // diffDays === 0 means same day (duplicate entry), keep streak as-is
    }
    
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    
    lastDate = date;
  }
  
  // Check if current streak is still active (read today or yesterday)
  let currentStreak = 0;
  if (lastDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = differenceInCalendarDays(today, lastDate);
    if (diffDays <= 1) {
      currentStreak = tempStreak;
    }
  }

  stats.currentStreak = currentStreak;
  stats.longestStreak = longestStreak;

  // Build the selected chart range using local calendar dates. Avoid ISO conversion
  // here because it can shift a user's day when their timezone is not UTC.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let startDate: Date | null = null;
  if (selectedRange === "all") {
    if (dates.length > 0) startDate = dateFromKey(dates[0]);
  } else if (selectedRange === "year") {
    startDate = new Date(today.getFullYear(), 0, 1);
  } else {
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (Number(selectedRange) - 1));
  }

  if (startDate) {
    for (const day = new Date(startDate); day <= today; day.setDate(day.getDate() + 1)) {
      const date = dateKey(day);
      stats.dailyStats.push(dateMap.get(date) || { date, minutes: 0, words: 0 });
    }
  }

  return stats;
}

export async function exportAllUserData(): Promise<any> {
  const { supabase, user } = await requireUser();

  const [
    { data: profile },
    { data: books },
    { data: userBooks },
    { data: sessions },
    { data: bookmarks },
    { data: highlights },
    { data: tags },
    { data: shelves }
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("books").select("*").eq("user_id", user.id),
    supabase.from("user_books").select("*").eq("user_id", user.id),
    supabase.from("reading_sessions").select("*").eq("user_id", user.id),
    supabase.from("bookmarks").select("*").eq("user_id", user.id),
    supabase.from("highlights").select("*").eq("user_id", user.id),
    supabase.from("tags").select("*").eq("user_id", user.id),
    supabase.from("shelves").select("*").eq("user_id", user.id)
  ]);

  return {
    exportedAt: new Date().toISOString(),
    user: { id: user.id, email: user.email },
    profile,
    books,
    userBooks,
    sessions,
    bookmarks,
    highlights,
    tags,
    shelves
  };
}

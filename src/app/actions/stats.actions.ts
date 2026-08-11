"use server";

import { createClient } from "@/lib/supabase/server";

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
  dailyStats: DailyStats[]; // Last 30 days
}

export async function getStats(): Promise<StatsData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

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

  if (!sessions || sessions.length === 0) {
    return stats;
  }

  // Aggregate by date
  const dateMap = new Map<string, DailyStats>();
  for (const session of sessions) {
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

  // Calculate streaks
  const dates = Array.from(dateMap.keys()).sort(); // YYYY-MM-DD string sorting
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;

  for (const dateStr of dates) {
    const date = new Date(dateStr);
    
    if (!lastDate) {
      tempStreak = 1;
    } else {
      const diffTime = Math.abs(date.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    
    lastDate = date;
  }
  
  // Check if current streak is still active (read today or yesterday)
  if (lastDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays <= 1) {
      currentStreak = tempStreak;
    } else {
      currentStreak = 0;
    }
  }

  stats.currentStreak = currentStreak;
  stats.longestStreak = longestStreak;

  // Last 30 days of stats for the chart
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    stats.dailyStats.push(dateMap.get(dateStr) || { date: dateStr, minutes: 0, words: 0 });
  }

  return stats;
}

export async function exportAllUserData(): Promise<any> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

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

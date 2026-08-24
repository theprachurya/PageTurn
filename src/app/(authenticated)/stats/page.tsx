"use client";

import { useEffect, useState } from "react";
import { getStats, type StatsData } from "@/app/actions/stats.actions";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { Loader2, Flame, BookOpen, Clock, Activity, CalendarDays, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to load stats", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-zinc-100">
        <Loader2 className="w-7 h-7 animate-spin text-gold-500 mb-4" />
        <p className="text-zinc-600 text-sm tracking-wide">Loading analytics...</p>
      </div>
    );
  }

  if (!stats) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const chartData = stats.dailyStats.map(d => ({
    name: formatDate(d.date),
    minutes: d.minutes,
    words: d.words,
    fullDate: d.date,
  }));

  const hasData = chartData.some(d => d.minutes > 0 || d.words > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 text-zinc-100 font-sans">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-100 tracking-tight mb-1">Reading Analytics</h2>
          <p className="text-sm text-zinc-500">Insights and trends for your reading journey.</p>
        </div>
        
        {/* Date Range Picker */}
        <div className="flex items-center gap-3 bg-[#111113] border border-[#1f1f23] rounded-lg px-4 py-2">
          <CalendarDays className="w-4 h-4 text-zinc-500" />
          <select className="bg-transparent border-none text-zinc-300 text-sm font-medium focus:ring-0 focus:outline-none cursor-pointer pr-4">
            <option className="bg-zinc-900" value="30">Last 30 Days</option>
            <option className="bg-zinc-900" value="90">Last 90 Days</option>
            <option className="bg-zinc-900" value="365">This Year</option>
            <option className="bg-zinc-900" value="all">All Time</option>
          </select>
        </div>
      </header>

      {/* Key Metrics Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {/* Current Streak */}
        <div className="card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group border-gold-500/20">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-gold-500/[0.04] rounded-full blur-2xl group-hover:bg-gold-500/[0.08] transition-all duration-500"></div>
          <div className="flex items-start justify-between mb-6 relative z-10">
            <Flame className="text-gold-500 w-7 h-7" />
            <span className="flex items-center text-gold-500 text-[10px] font-semibold bg-gold-500/8 px-2 py-0.5 rounded">
              Active
            </span>
          </div>
          <div className="relative z-10">
            <p className="section-label mb-1">Current Streak</p>
            <h3 className="text-3xl font-bold text-zinc-100 flex items-baseline gap-1.5">
              {stats.currentStreak} <span className="text-base font-normal text-zinc-500">Days</span>
            </h3>
            <p className="text-xs text-zinc-600 mt-2 font-mono">Longest: {stats.longestStreak}</p>
          </div>
        </div>

        {/* Books Completed */}
        <div className="card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/[0.04] rounded-full blur-2xl group-hover:bg-emerald-500/[0.08] transition-all duration-500"></div>
          <div className="flex items-start justify-between mb-6 relative z-10">
            <BookOpen className="text-emerald-500 w-7 h-7" />
            <span className="flex items-center text-emerald-400 text-[10px] font-semibold bg-emerald-400/8 px-2 py-0.5 rounded">
              <TrendingUp className="w-3 h-3 mr-1" /> Lifetime
            </span>
          </div>
          <div className="relative z-10">
            <p className="section-label mb-1">Total Books Read</p>
            <h3 className="text-3xl font-bold text-zinc-100">{stats.booksCompleted}</h3>
          </div>
        </div>

        {/* Words Read */}
        <div className="card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-gold-500/[0.04] rounded-full blur-2xl group-hover:bg-gold-500/[0.08] transition-all duration-500"></div>
          <div className="flex items-start justify-between mb-6 relative z-10">
            <Activity className="text-gold-500 w-7 h-7" />
          </div>
          <div className="relative z-10">
            <p className="section-label mb-1">Words Read</p>
            <h3 className="text-3xl font-bold gradient-text-gold">
              {stats.totalWords.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Total Time Read */}
        <div className="card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-blue-500/[0.04] rounded-full blur-2xl group-hover:bg-blue-500/[0.08] transition-all duration-500"></div>
          <div className="flex items-start justify-between mb-6 relative z-10">
            <Clock className="text-blue-400 w-7 h-7" />
          </div>
          <div className="relative z-10">
            <p className="section-label mb-1">Total Time Read</p>
            <h3 className="text-3xl font-bold text-zinc-100 flex items-baseline gap-1.5">
              {Math.round(stats.totalMinutes / 60)}<span className="text-base font-normal text-zinc-500">h</span> {stats.totalMinutes % 60}<span className="text-base font-normal text-zinc-500">m</span>
            </h3>
          </div>
        </div>
      </section>

      {/* Data Visualizations */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-12">
        {/* Reading Time Chart */}
        <div className="card rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">Reading Time</h3>
              <p className="text-xs text-zinc-600 mt-0.5">Minutes per day (Last 30 Days)</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-600">
              <span>Less</span>
              <div className="w-2.5 h-2.5 rounded-sm bg-zinc-800"></div>
              <div className="w-2.5 h-2.5 rounded-sm bg-gold-900/40"></div>
              <div className="w-2.5 h-2.5 rounded-sm bg-gold-600/60"></div>
              <div className="w-2.5 h-2.5 rounded-sm bg-gold-500"></div>
              <span>More</span>
            </div>
          </div>
          
          <div className="h-72 w-full">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f23" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#52525b", fontFamily: "sans-serif" }}
                    minTickGap={20}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#52525b", fontFamily: "sans-serif" }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(212, 168, 83, 0.04)' }}
                    contentStyle={{ backgroundColor: '#151517', borderRadius: '10px', border: '1px solid #1f1f23', color: '#fafaf9', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                  />
                  <Bar 
                    dataKey="minutes" 
                    fill="#d4a853" 
                    radius={[3, 3, 0, 0]} 
                    name="Minutes"
                    animationDuration={1200}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                <Activity className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">No reading data for the last 30 days yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Words Read Chart */}
        <div className="card rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">Words Read</h3>
              <p className="text-xs text-zinc-600 mt-0.5">Volume per day (Last 30 Days)</p>
            </div>
            <div className="p-2 bg-zinc-800/30 rounded-lg border border-zinc-800/40">
              <Activity className="w-4 h-4 text-gold-500" />
            </div>
          </div>
          
          <div className="h-72 w-full">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f23" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#52525b", fontFamily: "sans-serif" }}
                    minTickGap={20}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#52525b", fontFamily: "sans-serif" }}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#27272a', strokeWidth: 1, strokeDasharray: '5 5' }}
                    contentStyle={{ backgroundColor: '#151517', borderRadius: '10px', border: '1px solid #1f1f23', color: '#fafaf9', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="words" 
                    stroke="#d4a853" 
                    strokeWidth={2.5}
                    dot={{ r: 3.5, strokeWidth: 2, fill: "#08080a", stroke: "#d4a853" }}
                    activeDot={{ r: 5, fill: "#d4a853", stroke: "#08080a", strokeWidth: 2 }}
                    name="Words"
                    animationDuration={1200}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                <Activity className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">No reading data for the last 30 days yet.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

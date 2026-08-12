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
        <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-4" />
        <p className="text-zinc-400 font-mono text-sm tracking-widest uppercase">Crunching analytics...</p>
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
          <h2 className="text-4xl md:text-5xl font-extrabold text-zinc-100 tracking-tight mb-2">Reading Analytics</h2>
          <p className="text-lg text-zinc-400">Insights and trends for your reading journey.</p>
        </div>
        
        {/* Date Range Picker Placeholder */}
        <div className="flex items-center gap-3 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-xl px-4 py-2">
          <CalendarDays className="w-5 h-5 text-zinc-400" />
          <select className="bg-transparent border-none text-zinc-100 text-sm font-medium focus:ring-0 focus:outline-none cursor-pointer pr-4">
            <option className="bg-zinc-900" value="30">Last 30 Days</option>
            <option className="bg-zinc-900" value="90">Last 90 Days</option>
            <option className="bg-zinc-900" value="365">This Year</option>
            <option className="bg-zinc-900" value="all">All Time</option>
          </select>
        </div>
      </header>

      {/* Key Metrics Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Current Streak */}
        <div className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group border border-red-500/30">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-600/10 rounded-full blur-2xl group-hover:bg-red-600/20 transition-all duration-500"></div>
          <div className="flex items-start justify-between mb-8 relative z-10">
            <Flame className="text-red-500 w-8 h-8 animate-pulse" />
            <span className="flex items-center text-red-500 text-xs font-bold bg-red-500/10 px-2 py-1 rounded">
              Active
            </span>
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Current Streak</p>
            <h3 className="text-4xl font-extrabold text-zinc-100 flex items-baseline gap-2">
              {stats.currentStreak} <span className="text-lg font-normal text-zinc-400">Days</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-2 font-mono">Longest: {stats.longestStreak}</p>
          </div>
        </div>

        {/* Books Completed */}
        <div className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group border border-zinc-800">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-600/10 rounded-full blur-2xl group-hover:bg-emerald-600/20 transition-all duration-500"></div>
          <div className="flex items-start justify-between mb-8 relative z-10">
            <BookOpen className="text-emerald-500 w-8 h-8" />
            <span className="flex items-center text-emerald-400 text-xs font-bold bg-emerald-400/10 px-2 py-1 rounded">
              <TrendingUp className="w-3 h-3 mr-1" /> Lifetime
            </span>
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Books Read</p>
            <h3 className="text-4xl font-extrabold text-zinc-100">{stats.booksCompleted}</h3>
          </div>
        </div>

        {/* Pages Turned (Estimated via Words) */}
        <div className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group border border-zinc-800">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-600/10 rounded-full blur-2xl group-hover:bg-red-600/20 transition-all duration-500"></div>
          <div className="flex items-start justify-between mb-8 relative z-10">
            <Activity className="text-red-500 w-8 h-8" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Words Read</p>
            <h3 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-400" style={{ textShadow: "0 0 20px rgba(220,38,38,0.3)" }}>
              {stats.totalWords.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Total Time Read */}
        <div className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group border border-zinc-800">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl group-hover:bg-blue-600/20 transition-all duration-500"></div>
          <div className="flex items-start justify-between mb-8 relative z-10">
            <Clock className="text-blue-500 w-8 h-8" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Time Read</p>
            <h3 className="text-4xl font-extrabold text-zinc-100 flex items-baseline gap-2">
              {Math.round(stats.totalMinutes / 60)}<span className="text-lg font-normal text-zinc-400">h</span> {stats.totalMinutes % 60}<span className="text-lg font-normal text-zinc-400">m</span>
            </h3>
          </div>
        </div>
      </section>

      {/* Data Visualizations */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        {/* Reading Time Chart */}
        <div className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 border border-zinc-800 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-bold text-zinc-100">Reading Time</h3>
              <p className="text-sm text-zinc-500">Minutes per day (Last 30 Days)</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
              <span>Less</span>
              <div className="w-3 h-3 rounded-sm bg-zinc-800"></div>
              <div className="w-3 h-3 rounded-sm bg-red-900/40"></div>
              <div className="w-3 h-3 rounded-sm bg-red-600/60"></div>
              <div className="w-3 h-3 rounded-sm bg-red-500"></div>
              <span>More</span>
            </div>
          </div>
          
          <div className="h-72 w-full">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#71717a", fontFamily: "sans-serif" }}
                    minTickGap={20}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#71717a", fontFamily: "sans-serif" }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(220, 38, 38, 0.05)' }}
                    contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #3f3f46', color: '#f4f4f5', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                  />
                  <Bar 
                    dataKey="minutes" 
                    fill="#dc2626" 
                    radius={[4, 4, 0, 0]} 
                    name="Minutes"
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
                <Activity className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">No reading data for the last 30 days yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Words Read Chart */}
        <div className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 border border-zinc-800 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-bold text-zinc-100">Words Read</h3>
              <p className="text-sm text-zinc-500">Volume per day (Last 30 Days)</p>
            </div>
            <div className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
              <Activity className="w-5 h-5 text-red-500" />
            </div>
          </div>
          
          <div className="h-72 w-full">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#71717a", fontFamily: "sans-serif" }}
                    minTickGap={20}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#71717a", fontFamily: "sans-serif" }}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '5 5' }}
                    contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #3f3f46', color: '#f4f4f5', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="words" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: "#09090b", stroke: "#dc2626" }}
                    activeDot={{ r: 6, fill: "#dc2626", stroke: "#09090b", strokeWidth: 2 }}
                    name="Words"
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
                <Activity className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">No reading data for the last 30 days yet.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

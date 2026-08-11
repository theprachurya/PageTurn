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
import { Loader2, Flame, BookOpen, Clock, Activity } from "lucide-react";
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
        <p className="text-zinc-400 font-mono text-sm">Crunching the analytics...</p>
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
    <div className="max-w-5xl mx-auto pb-20 px-4 md:px-8 py-8 text-zinc-100">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-100 mb-1">Reading Stats</h1>
          <p className="text-zinc-400 text-sm">Your reading analytics & habits in numbers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={<Flame className="w-6 h-6 text-red-500 animate-pulse" />}
          label="Current Streak"
          value={`${stats.currentStreak} Days`}
          subtext={`Longest: ${stats.longestStreak} Days`}
          color="bg-red-950/60 border border-red-900/40"
        />
        <StatCard 
          icon={<Clock className="w-6 h-6 text-rose-400" />}
          label="Total Time Read"
          value={`${Math.round(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m`}
          color="bg-zinc-800/80 border border-zinc-700/60"
        />
        <StatCard 
          icon={<Activity className="w-6 h-6 text-red-400" />}
          label="Words Read"
          value={stats.totalWords.toLocaleString()}
          color="bg-zinc-800/80 border border-zinc-700/60"
        />
        <StatCard 
          icon={<BookOpen className="w-6 h-6 text-emerald-400" />}
          label="Books Completed"
          value={`${stats.booksCompleted}`}
          color="bg-emerald-950/60 border border-emerald-900/40"
        />
      </div>

      <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800 shadow-xl backdrop-blur-md mb-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-zinc-100">Reading Time (Last 30 Days)</h2>
          <p className="text-zinc-400 text-sm">Minutes spent reading per day</p>
        </div>
        
        <div className="h-72 w-full">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  minTickGap={20}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#71717a" }}
                />
                <Tooltip 
                  cursor={{ fill: '#18181b' }}
                  contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #3f3f46', color: '#f4f4f5' }}
                />
                <Bar 
                  dataKey="minutes" 
                  fill="#dc2626" 
                  radius={[4, 4, 0, 0]} 
                  name="Minutes"
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

      <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800 shadow-xl backdrop-blur-md">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-zinc-100">Words Read (Last 30 Days)</h2>
          <p className="text-zinc-400 text-sm">Estimated words read per day</p>
        </div>
        
        <div className="h-72 w-full">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  minTickGap={20}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#71717a" }}
                />
                <Tooltip 
                  cursor={{ stroke: '#3f3f46' }}
                  contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #3f3f46', color: '#f4f4f5' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="words" 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: "#dc2626" }}
                  activeDot={{ r: 6 }}
                  name="Words"
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
    </div>
  );
}

function StatCard({ icon, label, value, subtext, color }: { icon: React.ReactNode, label: string, value: string, subtext?: string, color: string }) {
  return (
    <div className="bg-zinc-900/80 rounded-3xl p-5 border border-zinc-800 shadow-xl flex flex-col h-full backdrop-blur-md">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("p-2.5 rounded-xl", color)}>
          {icon}
        </div>
        <h3 className="font-semibold text-xs uppercase tracking-wider text-zinc-400">{label}</h3>
      </div>
      <div className="mt-auto">
        <div className="text-3xl font-extrabold text-zinc-100">{value}</div>
        {subtext && <div className="text-xs text-zinc-400 font-mono mt-1">{subtext}</div>}
      </div>
    </div>
  );
}


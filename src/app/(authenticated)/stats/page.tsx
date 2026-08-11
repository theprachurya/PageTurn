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
import { Loader2, Flame, BookOpen, Clock, Activity, Download } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
        <p className="text-slate-500 font-medium">Crunching the numbers...</p>
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
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-1">Reading Stats</h1>
          <p className="text-slate-500">Your reading journey in numbers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={<Flame className="w-6 h-6 text-orange-500" />}
          label="Current Streak"
          value={`${stats.currentStreak} Days`}
          subtext={`Longest: ${stats.longestStreak} Days`}
          color="bg-orange-50"
        />
        <StatCard 
          icon={<Clock className="w-6 h-6 text-blue-500" />}
          label="Total Time Read"
          value={`${Math.round(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m`}
          color="bg-blue-50"
        />
        <StatCard 
          icon={<Activity className="w-6 h-6 text-purple-500" />}
          label="Words Read"
          value={stats.totalWords.toLocaleString()}
          color="bg-purple-50"
        />
        <StatCard 
          icon={<BookOpen className="w-6 h-6 text-emerald-500" />}
          label="Books Completed"
          value={`${stats.booksCompleted}`}
          color="bg-emerald-50"
        />
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">Reading Time (Last 30 Days)</h2>
          <p className="text-slate-500 text-sm">Minutes spent reading per day</p>
        </div>
        
        <div className="h-72 w-full">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  minTickGap={20}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="minutes" 
                  fill="#8b5cf6" 
                  radius={[4, 4, 0, 0]} 
                  name="Minutes"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              <Activity className="w-12 h-12 mb-3 opacity-20" />
              <p>No reading data for the last 30 days yet.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">Words Read (Last 30 Days)</h2>
          <p className="text-slate-500 text-sm">Estimated words read per day</p>
        </div>
        
        <div className="h-72 w-full">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  minTickGap={20}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                />
                <Tooltip 
                  cursor={{ stroke: '#cbd5e1' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="words" 
                  stroke="#ec4899" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  name="Words"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              <Activity className="w-12 h-12 mb-3 opacity-20" />
              <p>No reading data for the last 30 days yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtext, color }: { icon: React.ReactNode, label: string, value: string, subtext?: string, color: string }) {
  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("p-2.5 rounded-xl", color)}>
          {icon}
        </div>
        <h3 className="font-semibold text-slate-600">{label}</h3>
      </div>
      <div className="mt-auto">
        <div className="text-3xl font-bold text-slate-800">{value}</div>
        {subtext && <div className="text-sm text-slate-500 mt-1">{subtext}</div>}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Save, Target, User as UserIcon, Loader2, Download } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { exportAllUserData } from "@/app/actions/stats.actions";

export default function SettingsPage() {
  const [dailyGoal, setDailyGoal] = useState(60);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabaseRef = useRef<SupabaseClient | null>(null);
  if (!supabaseRef.current && typeof window !== "undefined") {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current!;

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setEmail(user.email || "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("daily_goal_minutes")
      .eq("id", user.id)
      .single();

    if (profile) setDailyGoal(profile.daily_goal_minutes);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ daily_goal_minutes: dailyGoal })
      .eq("id", user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await exportAllUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pageturn-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export data:", err);
      alert("Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 text-zinc-100">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-zinc-100 mb-1">Settings</h1>
        <p className="text-zinc-400 text-sm">Customize your reading experience & account</p>
      </div>

      {/* Account Section */}
      <div className="rounded-3xl bg-zinc-900/80 border border-zinc-800 p-6 shadow-xl backdrop-blur-md mb-6">
        <div className="flex items-center gap-2 mb-4">
          <UserIcon className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-bold text-zinc-100">Account</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 font-mono mb-1.5 block">Email Address</label>
            <div className="px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm font-mono">
              {email}
            </div>
          </div>
        </div>
      </div>

      {/* Reading Goal Section */}
      <div className="rounded-3xl bg-zinc-900/80 border border-zinc-800 p-6 shadow-xl backdrop-blur-md mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-bold text-zinc-100">
            Daily Reading Goal
          </h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 font-mono mb-2 block">
              Target Minutes per Day
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={5}
                max={180}
                step={5}
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value))}
                className="flex-1 accent-red-600 cursor-pointer"
              />
              <div className="w-16 text-center px-3 py-1.5 rounded-xl bg-red-950/60 border border-red-900/50 text-red-400 font-bold text-sm font-mono">
                {dailyGoal}m
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-zinc-500 font-mono mt-1.5">
              <span>5 min</span>
              <span>3 hrs</span>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-sm shadow-lg shadow-red-950/60 transition-all disabled:opacity-50 cursor-pointer border border-red-500/30"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? "Saved ✓" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Data Section */}
      <div className="rounded-3xl bg-zinc-900/80 border border-zinc-800 p-6 shadow-xl backdrop-blur-md mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-bold text-zinc-100">
            Export Data
          </h2>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Download a complete JSON backup of your account data, including your reading history, shelves, tags, bookmarks, and highlights.
            </p>
          </div>

          <button
            onClick={handleExportData}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 font-medium text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {exporting ? "Exporting..." : "Export to JSON"}
          </button>
        </div>
      </div>

      {/* Sign Out */}
      <div className="rounded-3xl bg-zinc-900/80 border border-red-950/60 p-6 shadow-xl backdrop-blur-md">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-950/50 border border-red-900/60 text-red-400 font-medium text-sm hover:bg-red-900/40 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}


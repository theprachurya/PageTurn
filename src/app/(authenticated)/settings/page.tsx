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
        <div className="w-7 h-7 border-2 border-zinc-800 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 text-zinc-100">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">Settings</h1>
        <p className="text-zinc-500 text-sm">Customize your reading experience & account</p>
      </div>

      {/* Account Section */}
      <div className="card rounded-xl p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <UserIcon className="w-4 h-4 text-gold-500" />
          <h2 className="text-base font-semibold text-zinc-100">Account</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-zinc-500 font-mono mb-1.5 block uppercase tracking-wider">Email Address</label>
            <div className="px-4 py-2.5 rounded-lg bg-[#08080a] border border-[#1f1f23] text-zinc-300 text-sm font-mono">
              {email}
            </div>
          </div>
        </div>
      </div>

      {/* Reading Goal Section */}
      <div className="card rounded-xl p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-gold-500" />
          <h2 className="text-base font-semibold text-zinc-100">
            Daily Reading Goal
          </h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-zinc-500 font-mono mb-2 block uppercase tracking-wider">
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
                className="flex-1 accent-gold-500 cursor-pointer"
              />
              <div className="w-14 text-center px-3 py-1.5 rounded-lg bg-gold-500/8 border border-gold-500/15 text-gold-400 font-semibold text-sm font-mono">
                {dailyGoal}m
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-zinc-600 font-mono mt-1.5">
              <span>5 min</span>
              <span>3 hrs</span>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gold-500 hover:bg-gold-400 text-zinc-950 font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer"
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
      <div className="card rounded-xl p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-4 h-4 text-gold-500" />
          <h2 className="text-base font-semibold text-zinc-100">
            Export Data
          </h2>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-zinc-500 leading-relaxed mb-4">
              Download a complete JSON backup of your account data, including your reading history, shelves, tags, bookmarks, and highlights.
            </p>
          </div>

          <button
            onClick={handleExportData}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-800/60 border border-zinc-700/60 text-zinc-200 font-medium text-sm hover:bg-zinc-700/60 transition-colors disabled:opacity-50 cursor-pointer"
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
      <div className="card rounded-xl border-red-950/40 p-6">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-950/30 border border-red-900/40 text-red-400/80 font-medium text-sm hover:bg-red-900/30 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

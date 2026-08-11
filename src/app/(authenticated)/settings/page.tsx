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
        <div className="w-8 h-8 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-1">Settings</h1>
        <p className="text-slate-500">Customize your reading experience</p>
      </div>

      {/* Account Section */}
      <div className="rounded-3xl bg-white border border-purple-100/50 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <UserIcon className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-slate-800">Account</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-500 mb-1 block">Email</label>
            <div className="px-4 py-2.5 rounded-xl bg-purple-50 text-slate-600 text-sm">
              {email}
            </div>
          </div>
        </div>
      </div>

      {/* Reading Goal Section */}
      <div className="rounded-3xl bg-white border border-purple-100/50 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-slate-800">
            Daily Reading Goal
          </h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-500 mb-2 block">
              Minutes per day
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={5}
                max={180}
                step={5}
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value))}
                className="flex-1 accent-purple-500"
              />
              <div className="w-16 text-center px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 font-semibold text-sm">
                {dailyGoal}m
              </div>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>5 min</span>
              <span>3 hrs</span>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-lavender-600 text-white font-medium text-sm shadow-md shadow-purple-200/50 hover:scale-105 transition-all disabled:opacity-50 cursor-pointer"
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
      <div className="rounded-3xl bg-white border border-purple-100/50 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-slate-800">
            Export Data
          </h2>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-500 mb-4">
              Download a complete JSON backup of your account data, including your reading history, shelves, tags, bookmarks, and highlights.
            </p>
          </div>

          <button
            onClick={handleExportData}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
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
      <div className="rounded-3xl bg-white border border-red-100/50 p-6 shadow-sm">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 text-red-600 font-medium text-sm hover:bg-red-100 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

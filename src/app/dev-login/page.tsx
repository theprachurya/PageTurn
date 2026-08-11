"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DevLoginPage() {
  if (process.env.NODE_ENV !== "development") {
    return <div className="p-8 text-center text-red-500 font-bold">404 - Not Found (Dev Only)</div>;
  }

  const router = useRouter();
  const [status, setStatus] = useState("Initializing dev login...");
  
  const supabaseRef = useRef<any>(null);
  if (!supabaseRef.current && typeof window !== "undefined") {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;

  useEffect(() => {
    async function login() {
      if (!supabase) return;
      setStatus("Authenticating test@example.com...");
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "test@example.com",
        password: "password123",
      });

      if (error) {
        setStatus(`Error: ${error.message}`);
        console.error(error);
        return;
      }

      setStatus("Success! Redirecting to library...");
      setTimeout(() => {
        router.push("/library");
        router.refresh();
      }, 1000);
    }
    
    login();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-zinc-100 p-4">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center">
        <div className="w-12 h-12 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2 text-zinc-100">Developer Login</h1>
        <p className="text-zinc-400 text-sm font-mono">{status}</p>
      </div>
    </div>
  );
}


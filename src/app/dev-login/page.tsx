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
      // Add a small delay so we can see the success message
      setTimeout(() => {
        router.push("/library");
        router.refresh(); // Ensure the server components get the new session
      }, 1000);
    }
    
    login();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Developer Login</h1>
        <p className="text-slate-500 text-sm">{status}</p>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
const supabase = supabaseBrowser;

// Bungkus useSearchParams di dalam Suspense boundary
function ForgotForm() {
  const router = useRouter();
  const sp = useSearchParams();

  const [email, setEmail] = useState(sp.get("email") || "");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (!/\S+@\S+\.\S+/.test(email)) {
      setMsg("Email tidak valid.");
      return;
    }

    setLoading(true);
    try {
      const origin =
        (process.env.NEXT_PUBLIC_SITE_URL ||
          (typeof window !== "undefined" ? window.location.origin : "")
        )?.replace(/\/$/, "");
      const redirectTo = `${origin}/auth/otp?email=${encodeURIComponent(email)}`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;

      if (typeof window !== "undefined") localStorage.setItem("reset_email", email);
      router.push(`/auth/otp?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setMsg(err?.message || "Gagal mengirim email reset.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-neutral-100">
      <main className="mx-auto w-full max-w-[430px] min-h-[100dvh] bg-white shadow md:border flex flex-col px-6 pt-10 pb-[env(safe-area-inset-bottom)]">
        <h1 className="text-black text-[22px] font-bold text-center">Lupa Password</h1>
        <p className="text-sm text-gray-600 text-center mt-1">
          Masukkan email untuk menerima kode reset.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="block text-black mb-1 font-medium">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-[#D1D5DB] rounded-lg px-3 py-3 text-gray-700"
            />
          </label>

          {msg && <p className="text-sm text-center text-rose-600">{msg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#D6336C] text-white font-semibold rounded-lg py-3 disabled:opacity-60"
          >
            {loading ? "Mengirim..." : "Kirim Kode Reset"}
          </button>
        </form>
      </main>
    </div>
  );
}

// Suspense boundary di level page
export default function ForgotPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Memuat…</div>}>
      <ForgotForm />
    </Suspense>
  );
}

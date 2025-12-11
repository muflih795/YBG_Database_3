"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
const supabase = supabaseBrowser;

function OtpContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const qEmail = sp.get("email") || "";
    const mem =
      (typeof window !== "undefined" && localStorage.getItem("reset_email")) ||
      "";
    setEmail(qEmail || mem);
  }, [sp]);

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setMsg("");

    const emailTrim = (email || "").trim().toLowerCase();
    const code = (token || "").replace(/\D/g, "");

    if (!/\S+@\S+\.\S+/.test(emailTrim)) return setMsg("Email tidak valid.");
    if (!code || code.length < 6) return setMsg("Masukkan kode (6 digit).");
    if (!pw1 || pw1.length < 8) return setMsg("Password minimal 8 karakter.");
    if (pw1 !== pw2) return setMsg("Konfirmasi password tidak sama.");

    setLoading(true);
    try {
      // 1) Verifikasi OTP recovery (6 digit)
      const { data, error: verErr } = await supabase.auth.verifyOtp({
        email: emailTrim,
        token: code,
        type: "recovery",
      });
      if (verErr) throw verErr;
      if (!data?.session) {
        throw new Error("Sesi recovery gagal dibuat. Periksa kode/masa berlaku.");
      }

      // 2) Update password
      const { error: updErr } = await supabase.auth.updateUser({ password: pw1 });
      if (updErr) throw updErr;

      await supabase.auth.refreshSession();

      if (typeof window !== "undefined") localStorage.removeItem("reset_email");
      router.replace("/home");
    } catch (err) {
      setMsg(err?.message || "Gagal memproses kode / mengganti password.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (loading) return;
    setMsg("");

    const emailTrim = (email || "").trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(emailTrim)) return setMsg("Email tidak valid.");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailTrim,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setMsg("Kode baru dikirim. Cek inbox/spam.");
    } catch (err) {
      setMsg(err?.message || "Gagal mengirim ulang kode.");
    }
  }

  return (
    <div className="min-h-[100dvh] bg-neutral-100">
      <main className="mx-auto w-full max-w-[430px] min-h-[100dvh] bg-white shadow md:border flex flex-col px-6 pt-10 pb-[env(safe-area-inset-bottom)]">
        <h1 className="text-black text-[22px] font-bold text-center">Masukkan Kode Reset</h1>
        <p className="text-sm text-gray-600 text-center mt-1">
          Cek email kamu. Ketik <b>kode 6 digit</b> lalu buat password baru.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="block text-black mb-1 font-medium">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-[#D1D5DB] text-black rounded-lg px-3 py-3"
            />
          </label>

          <label className="block text-sm">
            <span className="block text-black mb-1 font-medium">Kode (6 digit)</span>
            <input
              inputMode="numeric"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full border border-[#D1D5DB] text-black rounded-lg px-3 py-3"
            />
          </label>

          <label className="block text-sm">
            <span className="block text-black mb-1 font-medium">Password baru</span>
            <div className="flex items-stretch gap-2">
              <input
                type={showPw1 ? "text" : "password"}
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-[#D1D5DB] text-black rounded-lg px-3 py-3"
              />
              <button
                type="button"
                onClick={() => setShowPw1((s) => !s)}
                className="px-3 rounded-lg border border-[#D1D5DB] text-sm text-[#D6336C]"
              >
                {showPw1 ? "Sembunyi" : "Lihat"}
              </button>
            </div>
          </label>

          <label className="block text-sm">
            <span className="block text-black mb-1 font-medium">Ulangi password baru</span>
            <div className="flex items-stretch gap-2">
              <input
                type={showPw2 ? "text" : "password"}
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-[#D1D5DB] text-black rounded-lg px-3 py-3"
              />
              <button
                type="button"
                onClick={() => setShowPw2((s) => !s)}
                className="px-3 rounded-lg border border-[#D1D5DB] text-sm text-[#D6336C]"
              >
                {showPw2 ? "Sembunyi" : "Lihat"}
              </button>
            </div>
          </label>

          {msg && <p className="text-sm text-center text-rose-600">{msg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#D6336C] text-white font-semibold rounded-lg py-3 disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Simpan Password"}
          </button>

          <button
            type="button"
            onClick={resend}
            disabled={loading}
            className="w-full border mt-1 border-[#D6336C] text-[#D6336C] font-semibold rounded-lg py-3 disabled:opacity-60"
          >
            Kirim Ulang Kode
          </button>
        </form>
      </main>
    </div>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Memuat…</div>}>
      <OtpContent />
    </Suspense>
  );
}

"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
const supabase = supabaseBrowser;
import Image from "next/image";

export const dynamic = "force-dynamic"; // hindari SSG/prerender

function OtpClient() {
  const q = useSearchParams();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const email = q.get("email") || "";
  const mode = useMemo(() => (email ? "email" : "unknown"), [email]);

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0); // ⬅️ cooldown anti-429

  // timer cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (mode === "unknown") setMsg("Tidak ada email di URL. Kembali ke login.");
    if (!supabase) setMsg("Konfigurasi belum siap. Coba beberapa saat lagi.");
  }, [mode, supabase]);

  async function onVerify(e) {
    e.preventDefault();
    setMsg("");

    if (!code || code.length < 6) return setMsg("Masukkan 6 digit kode OTP.");
    if (!supabase) return setMsg("Konfigurasi belum siap. Coba beberapa saat lagi.");

    setLoading(true);
    try {
      // verifikasi OTP
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (error) throw error;

      // jika ada data registrasi yang tertunda, set password & profil
      const raw = sessionStorage.getItem("pending_registration");
      const pending = raw ? JSON.parse(raw) : null;

      if (pending && pending.email === email) {
        const { password, name, phone } = pending;
        const { error: updErr } = await supabase.auth.updateUser({
          password,
          data: { full_name: name || null, phone: phone || null },
        });

        // 422 = "New password should be different..." → anggap sudah terset/sukses
        if (updErr) {
          const msg = (updErr.message || "").toLowerCase();
          if (!(updErr.status === 422 || msg.includes("new password should be different"))) {
            throw updErr;
          }
        }

        sessionStorage.removeItem("pending_registration");
      }

      router.replace("/home");
    } catch (err) {
      console.error(err);
      setMsg(err?.message || "Kode OTP salah atau kadaluarsa.");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (cooldown > 0) return; // ⬅️ cegah spam
    setResending(true);
    setMsg("");
    try {
      if (!supabase) throw new Error("Konfigurasi belum siap.");
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setMsg("Kode OTP baru sudah dikirim. Cek inbox/spam.");
      setCooldown(15); // ⬅️ tunggu 15 detik
    } catch (err) {
      setMsg(err?.message || "Gagal mengirim ulang OTP.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-neutral-100">
      <main className="mx-auto w-full max-w-[430px] bg-white shadow md:border px-6 pt-10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex flex-col items-center">
          <Image src="/logo_ybg.png" alt="YBG" width={96} height={96} />
          <h1 className="text-black text-[22px] font-semibold mt-2">Konfirmasi OTP</h1>
          <p className="text-sm text-gray-600 mt-1 text-center">
            Kode dikirim ke <span className="font-medium text-[#D6336C]">{email || "—"}</span>
          </p>
        </div>

        <form onSubmit={onVerify} className="mt-6 space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="Masukkan 6 digit kode"
            className="border border-[#D1D5DB] w-full rounded-lg px-3 py-3 text-center tracking-[6px] text-lg"
          />

          {msg && <div className="text-center text-[13px] text-rose-600">{msg}</div>}

          <button
            disabled={loading || !supabase}
            className="w-full bg-[#D6336C] text-white font-semibold rounded-lg py-3 disabled:opacity-60"
          >
            {loading ? "Memverifikasi..." : "Verifikasi & Selesai"}
          </button>

          <button
            type="button"
            disabled={resending || cooldown > 0 || !supabase}
            onClick={onResend}
            className="w-full border border-[#D6336C] text-[#D6336C] font-semibold rounded-lg py-3 disabled:opacity-60"
          >
            {resending ? "Mengirim ulang..." : cooldown > 0 ? `Tunggu ${cooldown}s` : "Kirim Ulang Kode"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full border border-gray-300 text-gray-700 rounded-lg py-3"
          >
            Kembali ke Login
          </button>
        </form>
      </main>
    </div>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Memuat…</div>}>
      <OtpClient />
    </Suspense>
  );
}

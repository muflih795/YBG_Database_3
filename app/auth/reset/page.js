// app/auth/reset/page.js
"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const supabase = supabaseBrowser;          // ← JANGAN dipanggil sebagai fungsi
export const dynamic = "force-dynamic";

function ResetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ready, setReady] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setMsg("");

      // Handle fragment dari email link Supabase (#access_token=...).
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : "");

      const err = hashParams.get("error");
      const errCode = hashParams.get("error_code");
      const errDesc = hashParams.get("error_description");

      try {
        if (err || errCode) {
          throw new Error(
            errCode === "otp_expired"
              ? "Tautan sudah tidak berlaku (mungkin sudah dipakai). Minta tautan baru."
              : errDesc || "Tautan tidak valid."
          );
        }

        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;

          // Hilangkan fragment dari URL
          if (!cancelled) {
            const { pathname, search } = window.location;
            window.history.replaceState({}, "", pathname + (search || ""));
          }
        } else {
          // Fallback ?code=/oobCode dari beberapa provider
          const code = searchParams.get("code") || searchParams.get("oobCode");
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
          }
        }

        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          if (data?.session) setReady(true);
          else setMsg("Sesi pemulihan tidak ditemukan. Ulangi proses lupa password.");
        }
      } catch (e) {
        if (!cancelled) {
          setMsg(e?.message || "Tautan tidak valid atau kedaluwarsa. Minta tautan reset baru.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (!pw1 || pw1.length < 8) return setMsg("Password minimal 8 karakter.");
    if (pw1 !== pw2) return setMsg("Konfirmasi password tidak sama.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;

      setMsg("Password berhasil diubah. Silakan login ulang.");
      await supabase.auth.signOut();

      router.replace("/login");
    } catch (err) {
      setMsg(err?.message || "Gagal memperbarui password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-neutral-100">
      <main className="mx-auto w-full max-w-[430px] min-h-[100dvh] bg-white shadow md:border flex flex-col px-6 pt-10 pb-[env(safe-area-inset-bottom)]">
        <h1 className="text-black text-[22px] font-bold text-center">Reset Password</h1>
        <p className="text-sm text-gray-600 text-center mt-1">
          Masukkan password barumu di bawah ini.
        </p>

        {!ready ? (
          <div className="mt-6 text-center text-sm text-rose-600">
            {msg || "Menyiapkan sesi..."}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="block text-black mb-1 font-medium">Password baru</span>
              <div className="flex gap-2">
                <input
                  type={show1 ? "text" : "password"}
                  value={pw1}
                  onChange={(e) => setPw1(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-[#D1D5DB] rounded-lg px-3 py-3 text-gray-700"
                />
                <button
                  type="button"
                  onClick={() => setShow1((v) => !v)}
                  className="px-3 rounded-lg border border-[#D1D5DB] text-sm text-[#D6336C]"
                >
                  {show1 ? "Sembunyi" : "Lihat"}
                </button>
              </div>
            </label>

            <label className="block text-sm">
              <span className="block text-black mb-1 font-medium">Ulangi password baru</span>
              <div className="flex gap-2">
                <input
                  type={show2 ? "text" : "password"}
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-[#D1D5DB] rounded-lg px-3 py-3 text-gray-700"
                />
                <button
                  type="button"
                  onClick={() => setShow2((v) => !v)}
                  className="px-3 rounded-lg border border-[#D1D5DB] text-sm text-[#D6336C]"
                >
                  {show2 ? "Sembunyi" : "Lihat"}
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
          </form>
        )}
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Memuat…</div>}>
      <ResetContent />
    </Suspense>
  );
}


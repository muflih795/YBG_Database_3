"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/supabaseBrowser";

export default function ForgotPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    const emailTrim = email.trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(emailTrim)) return setMsg("Email tidak valid.");

    setLoading(true);
    try {
      const origin =
        (process.env.NEXT_PUBLIC_SITE_URL ||
          (typeof window !== "undefined" ? window.location.origin : ""))
          .replace(/\/$/, "");
      const redirectTo = `${origin}/auth/otp?email=${encodeURIComponent(emailTrim)}`;

      const { error } = await supabase.auth.resetPasswordForEmail(emailTrim, { redirectTo });
      if (error) throw error;

      if (typeof window !== "undefined") localStorage.setItem("reset_email", emailTrim);
      router.push(`/auth/otp?email=${encodeURIComponent(emailTrim)}`);
    } catch (err) {
      setMsg(err?.message || "Gagal mengirim kode reset. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-[430px] p-6">
      <h1 className="text-xl font-semibold">Lupa Password</h1>
      <p className="text-sm text-gray-600">Masukkan email untuk menerima kode OTP.</p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input
          className="w-full border rounded px-3 py-2"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {msg && <p className="text-rose-600 text-sm">{msg}</p>}
        <button disabled={loading} className="w-full bg-pink-600 text-white rounded py-2">
          {loading ? "Mengirim..." : "Kirim Kode"}
        </button>
      </form>
    </main>
  );
}

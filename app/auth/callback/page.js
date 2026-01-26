"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const supabase = supabaseBrowser;

function CallbackInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [msg, setMsg] = useState("Memproses login Google...");

  useEffect(() => {
    const run = async () => {
      try {
        const code = sp.get("code");
        const next = sp.get("next") || "/home";
        const popup = sp.get("popup") === "1";

        const errDesc = sp.get("error_description") || sp.get("error");
        if (errDesc) {
          const payload = { type: "supabase-oauth", success: false, error: errDesc };
          if (window.opener && popup) window.opener.postMessage(payload, window.location.origin);
          setMsg("Login gagal: " + errDesc);
          if (window.opener && popup) setTimeout(() => window.close(), 400);
          return;
        }

        if (!code) {
          const payload = { type: "supabase-oauth", success: false, error: "Kode OAuth tidak ditemukan." };
          if (window.opener && popup) window.opener.postMessage(payload, window.location.origin);
          setMsg("Kode OAuth tidak ditemukan.");
          if (window.opener && popup) setTimeout(() => window.close(), 400);
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;

        const payload = { type: "supabase-oauth", success: true, next };
        if (window.opener && popup) {
          window.opener.postMessage(payload, window.location.origin);
          setMsg("Berhasil. Menutup popup...");
          setTimeout(() => window.close(), 250);
        } else {
          router.replace(next);
        }
      } catch (e) {
        const message = e?.message || "Terjadi kesalahan saat memproses login.";
        const payload = { type: "supabase-oauth", success: false, error: message };
        try {
          if (window.opener) window.opener.postMessage(payload, window.location.origin);
        } catch {}
        setMsg(message);
        if (window.opener) setTimeout(() => window.close(), 400);
      }
    };

    run();
  }, [sp, router]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-neutral-100 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow p-6 text-center">
        <div className="text-black font-semibold">OAuth Callback</div>
        <div className="text-sm text-gray-600 mt-2">{msg}</div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}

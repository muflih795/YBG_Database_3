"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";  

function MailGoInner() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const [count, setCount] = useState(2);

  useEffect(() => {
    const t = setInterval(() => setCount(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (count === 0) window.location.href = next;
  }, [count, next]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center">
      <div className="p-6 rounded-xl border shadow max-w-md text-center">
        <h1 className="text-lg font-semibold mb-2">Buka link reset password</h1>
        <p className="text-sm text-gray-600 mb-4">
          Demi keamanan, klik tombol di bawah untuk melanjutkan.
        </p>
        <a href={next} className="inline-block bg-[#D6336C] text-white px-4 py-2 rounded-lg">
          Lanjutkan
        </a>
        <p className="text-xs text-gray-400 mt-3">
          Mengalihkan otomatis dalam {count}s…
        </p>
      </div>
    </div>
  );
}

export default function MailGoPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Memuat…</div>}>
      <MailGoInner />
    </Suspense>
  );
}

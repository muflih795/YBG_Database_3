"use client";

import { useState } from "react";

export default function DebugEarnPoint() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleEarnTest = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/points/earn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 10,                 // jumlah poin yang mau ditambah
          description: "Top up test", // alasan (bebas)
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        console.error("earn error:", json);
        setMsg("Gagal menambah poin: " + (json?.error || "unknown error"));
        return;
      }

      console.log("earn result:", json);
      setMsg(`Berhasil tambah ${json.record.amount} poin (saldo sekarang: ${json.points})`);
    } catch (e) {
      console.error(e);
      setMsg("Request gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={handleEarnTest}
        disabled={loading}
        className="px-4 py-2 rounded bg-[#D6336C] text-white"
      >
        {loading ? "Menambah poin..." : "Top up 10 poin (debug)"}
      </button>
      {msg && <p className="mt-2 text-sm text-gray-700">{msg}</p>}
    </div>
  );
}

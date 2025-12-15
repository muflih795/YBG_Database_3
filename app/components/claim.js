// app/components/claim.js
"use client";

import Image from "next/image";
import { useState, useMemo, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const supabase = supabaseBrowser;

// generator kode voucher sederhana
function generateVoucherCode(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

// ⚠️ default export, supaya bisa di-import: import Claim from "../components/claim";
export default function Claim({
  reward,
  onClaimed,
  points: parentPoints = 0,
  userId,
}) {
  // 🧠 Semua HOOKS selalu dipanggil, tanpa kondisi
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // poin lokal untuk kartu ini
  const [effectivePoints, setEffectivePoints] = useState(
    Number(parentPoints ?? 0)
  );

  // sync kalau props points dari parent berubah
  useEffect(() => {
    setEffectivePoints(Number(parentPoints ?? 0));
  }, [parentPoints]);

  const stock = Number(reward?.stock ?? 0);
  const cost = Number(reward?.cost ?? 0);

  const isLoggedIn = !!userId;
  const hasEnoughPoints = effectivePoints >= cost;
  const hasStock = stock > 0;

  const canClaim = useMemo(() => {
    // kalau reward tidak ada → otomatis tidak bisa klaim
    if (!reward) return false;
    if (!isLoggedIn) return false;
    if (!hasStock) return false;
    if (!hasEnoughPoints) return false;
    return true;
  }, [reward, isLoggedIn, hasStock, hasEnoughPoints]);

  const disabledReason = !isLoggedIn
    ? "Kamu harus login untuk klaim."
    : !hasStock
    ? "Stok reward sudah habis."
    : !hasEnoughPoints
    ? "Poin kamu belum cukup."
    : "";

  const handleClaim = async () => {
    // tetap jaga guard di sini
    if (processing) return;
    if (!reward) return;
    if (!userId) {
      setLocalError("Kamu harus login untuk klaim reward.");
      return;
    }

    setLocalError("");
    setSuccessMsg("");

    if (!canClaim) {
      setLocalError(disabledReason || "Reward tidak dapat diklaim.");
      return;
    }

    setProcessing(true);

    try {
      const voucherCode = generateVoucherCode();

      // 1) simpan klaim ke reward_claims
      const { error: claimErr } = await supabase.from("reward_claims").insert({
        user_id: userId,
        reward_id: reward.id,
        title: reward.title,
        image_url: reward.image_url,
        voucher_code: voucherCode,
        status: "requested",
        guest_id: null,
        notes: null,
      });

      if (claimErr) {
        console.error("insert reward_claims error", claimErr);
        setLocalError("Gagal menyimpan klaim. Coba lagi nanti.");
        setProcessing(false);
        return;
      }

      // 2) catat pengurangan poin di user_points (delta negatif)
      if (cost > 0) {
        const { error: upErr } = await supabase.from("user_points").insert({
          user_id: userId,
          delta: -cost,
          reason: `Redeem reward: ${reward.title}`,
        });

        if (upErr) {
          console.error("insert user_points error", upErr);
          // jangan kurangi poin lokal kalau gagal
        } else {
          // kalau sukses, kurangi poin lokal supaya tombol langsung non-aktif
          setEffectivePoints((prev) => Math.max(prev - cost, 0));
        }
      }

      // 3) kurangi stok reward
      const newStock = stock > 0 ? stock - 1 : 0;
      const { error: stockErr } = await supabase
        .from("rewards")
        .update({ stock: newStock })
        .eq("id", reward.id);

      if (stockErr) {
        console.error("update rewards stock error", stockErr);
      }

      setSuccessMsg(`Klaim berhasil! Kode voucher: ${voucherCode}`);

      // kabari parent (Membership) supaya refresh header poin
      if (typeof onClaimed === "function") {
        await onClaimed(cost);
      }
    } catch (e) {
      console.error("handleClaim error", e);
      setLocalError("Terjadi kesalahan. Coba lagi nanti.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-3 shadow">
      {/* Gambar reward */}
      <div className="rounded-lg overflow-hidden">
        {reward?.image_url ? (
          <div className="relative w-full h-40 md:h-44 rounded-lg overflow-hidden">
            <Image
              src={reward.image_url}
              alt={reward?.title || "Reward"}
              fill
              sizes="(max-width:430px) 100vw, 430px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-40 md:h-44 bg-gray-100 rounded-lg" />
        )}
      </div>

      <div className="mt-3">
        <h3 className="text-sm text-black font-medium">
          {reward?.title || "Reward"}
        </h3>
        <p className="text-sm text-pink-600">
          {Number.isFinite(cost) ? cost : 0} point
        </p>
        {Number.isFinite(stock) && (
          <p className="text-[11px] text-gray-500">
            Stok: {stock > 0 ? stock : "Habis"}
          </p>
        )}
      </div>

      <div className="mt-3">
        <button
          onClick={handleClaim}
          disabled={!canClaim || processing}
          className={`w-full h-11 rounded-xl text-white font-medium transition ${
            !canClaim || processing
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-[#D6336C] hover:bg-[#b02f56]"
          }`}
        >
          {processing ? "Memproses..." : "Klaim Sekarang"}
        </button>
      </div>

      {disabledReason && !processing && !successMsg && (
        <p className="mt-1 text-[11px] text-gray-500">{disabledReason}</p>
      )}

      {localError && (
        <p className="mt-2 text-xs text-rose-600">{localError}</p>
      )}

      {successMsg && (
        <p className="mt-2 text-xs text-emerald-600">{successMsg}</p>
      )}
    </div>
  );
}

// app/membership/page.js
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import Claim from "../components/claim";
import BottomNavigation from "../components/bottomnav";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const supabase = supabaseBrowser;

/** Definisi tier */
const TIERS = [
  { id: "friend", name: "Friend", threshold: 25 },
  { id: "bestie", name: "Bestie", threshold: 50 },
  { id: "sisters", name: "Sisters", threshold: 100 },
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(n, max));
}

function formatDateID(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Hitung tier & progress */
function getTierInfo(points) {
  const max = TIERS[TIERS.length - 1].threshold;
  const absPercent = clamp((points / max) * 100, 0, 100);

  let idx = -1;
  for (let i = 0; i < TIERS.length; i++) {
    if (points >= TIERS[i].threshold) idx = i;
  }

  const cur = idx >= 0 ? TIERS[idx] : null;
  const next = idx < TIERS.length - 1 ? TIERS[idx + 1] : null;

  if (!next) {
    return {
      currentTierName: cur ? cur.name : "—",
      nextTierName: null,
      spanPercent: 100,
      absPercent,
      need: 0,
      base: cur ? cur.threshold : 0,
      target: max,
      label: "Kamu sudah di tier tertinggi 🎉",
    };
  }

  const base = cur ? cur.threshold : 0;
  const target = next.threshold;
  const span = target - base;
  const progressed = clamp(points - base, 0, span);
  const spanPercent = (progressed / span) * 100;
  const need = clamp(target - points, 0, span);

  return {
    currentTierName: cur ? cur.name : "—",
    nextTierName: next.name,
    spanPercent,
    absPercent,
    need,
    base,
    target,
    label: `${need} poin lagi ke ${next.name}`,
  };
}

export default function Membership() {
  const [points, setPoints] = useState(0);
  const [rewards, setRewards] = useState([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [userId, setUserId] = useState(null);

  // info kadaluarsa poin
  const [expiry, setExpiry] = useState({
    nextDate: null,
    nextAmount: 0,
    soonAmount: 0,
    daysLeft: null,
    loading: false,
  });

  const getUserId = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      return data?.user?.id ?? null;
    } catch {
      return null;
    }
  };

  /** Hitung total poin dari tabel user_points */
  const refreshPoints = useCallback(async () => {
    setLoadingPoints(true);
    try {
      const uid = await getUserId();
      setUserId(uid);

      if (!uid) {
        setPoints(0);
        return;
      }

      const { data, error } = await supabase
        .from("user_points")
        .select("delta, expires_at")
        .eq("user_id", uid);

      if (error || !Array.isArray(data)) {
        setPoints(0);
        return;
      }

      const now = new Date();
      let total = 0;

      data.forEach((row) => {
        const delta = Number(row.delta || 0);
        // poin positif yang sudah expired tidak dihitung
        if (delta > 0 && row.expires_at) {
          const exp = new Date(row.expires_at);
          if (exp < now) return;
        }
        total += delta;
      });

      setPoints(total);
    } catch {
      setPoints(0);
    } finally {
      setLoadingPoints(false);
    }
  }, []);

  /** Hitung informasi poin yang akan hangus */
  const refreshExpiry = useCallback(async () => {
    setExpiry((s) => ({ ...s, loading: true }));
    try {
      const uid = await getUserId();
      if (!uid) {
        setExpiry({
          nextDate: null,
          nextAmount: 0,
          soonAmount: 0,
          daysLeft: null,
          loading: false,
        });
        return;
      }

      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("user_points")
        .select("delta, expires_at")
        .eq("user_id", uid)
        .gt("delta", 0)
        .gt("expires_at", nowIso)
        .order("expires_at", { ascending: true });

      if (error || !data || data.length === 0) {
        setExpiry({
          nextDate: null,
          nextAmount: 0,
          soonAmount: 0,
          daysLeft: null,
          loading: false,
        });
        return;
      }

      const firstDate = new Date(data[0].expires_at);
      const yyyy = firstDate.getFullYear();
      const mm = firstDate.getMonth();
      const dd = firstDate.getDate();

      let nextAmount = 0;
      let soonAmount = 0;
      const today = new Date();
      const in30 = new Date();
      in30.setDate(today.getDate() + 30);

      for (const row of data) {
        const exp = new Date(row.expires_at);
        if (
          exp.getFullYear() === yyyy &&
          exp.getMonth() === mm &&
          exp.getDate() === dd
        ) {
          nextAmount += Number(row.delta || 0);
        }
        if (exp <= in30) {
          soonAmount += Number(row.delta || 0);
        }
      }

      const daysLeft = Math.ceil(
        (firstDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      setExpiry({
        nextDate: firstDate.toISOString(),
        nextAmount,
        soonAmount,
        daysLeft: Math.max(daysLeft, 0),
        loading: false,
      });
    } catch {
      setExpiry({
        nextDate: null,
        nextAmount: 0,
        soonAmount: 0,
        daysLeft: null,
        loading: false,
      });
    }
  }, []);

  /** Ambil daftar reward aktif */
  const loadRewards = useCallback(async () => {
    setLoadingRewards(true);
    try {
      const { data, error } = await supabase
        .from("rewards")
        .select(
          "id, title, description, image_url, cost, stock, active, created_at"
        )
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error || !Array.isArray(data)) {
        setRewards([]);
      } else {
        setRewards(data);
      }
    } catch {
      setRewards([]);
    } finally {
      setLoadingRewards(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshPoints();
      await refreshExpiry();
      await loadRewards();
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      refreshPoints();
      refreshExpiry();
      loadRewards();
    });

    return () => {
      try {
        authListener?.subscription?.unsubscribe &&
          authListener.subscription.unsubscribe();
        if (authListener?.data?.subscription) {
          authListener.data.subscription.unsubscribe();
        }
      } catch {}
    };
  }, [refreshPoints, refreshExpiry, loadRewards]);

  const t = getTierInfo(points);

  return (
    <div className="min-h-[100dvh] bg-neutral-100 flex justify-center">
      <main
        className="w-full min-h-[100dvh] bg-white flex flex-col md:max-w-[430px] md:shadow md:border"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
      >
        {/* === HEADER YBG POIN KAMU (seperti gambar ke-2) === */}
        <div className="flex items-center justify-between bg-white shadow p-4 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Image
              src="/membership.svg"
              alt="poin"
              width={26}
              height={20}
              className="w-8 h-8"
            />
            <div className="leading-tight text-[#D6336C] text-sm">
              <p>YBG Poin Kamu</p>
              <h2 className="font-bold">
                {loadingPoints ? "..." : `${points} Poin`}
              </h2>

              {expiry.loading ? (
                <p>Mengecek masa berlaku…</p>
              ) : expiry.nextDate ? (
                <p>
                  {expiry.nextAmount} poin{" "}
                  <span className="font-semibold">akan hangus</span> pada{" "}
                  {formatDateID(expiry.nextDate)}{" "}
                  {typeof expiry.daysLeft === "number" && (
                    <span className="text-gray-600">
                      ({expiry.daysLeft} hari lagi)
                    </span>
                  )}
                </p>
              ) : (
                <p>Tidak ada poin yang akan hangus</p>
              )}
            </div>
          </div>

          <Link href="/history" className="text-[#D6336C] text-sm font-bold">
            History Poin
          </Link>
        </div>

        {/* === TIER & PROGRESS BAR === */}
        <section className="px-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="text-gray-600">Tier Kamu</p>
              <p className="text-base font-semibold text-[#D6336C]">
                {t.currentTierName}
              </p>
            </div>
            {t.nextTierName ? (
              <span className="text-xs text-gray-600">
                Target: <b>{t.nextTierName}</b> ({t.need} poin lagi)
              </span>
            ) : (
              <span className="text-xs text-emerald-600 font-medium">
                Top Tier
              </span>
            )}
          </div>

          <div className="mt-2">
            <div className="h-3 w-full rounded-full bg-pink-100 overflow-hidden">
              <div
                className="h-full bg-[#D6336C] transition-[width] duration-500"
                style={{ width: `${t.spanPercent.toFixed(1)}%` }}
              />
            </div>
            <div className="mt-1 text-[12px] text-gray-600">
              {t.nextTierName ? (
                <>
                  {t.label}
                  <span className="ml-1 text-gray-500">
                    ({Math.max(t.base, 0)} / {t.target} ·{" "}
                    {t.spanPercent.toFixed(1)}%)
                  </span>
                </>
              ) : (
                t.label
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="relative h-1.5 bg-gray-200/60 rounded-full">
              <div
                className="absolute -top-1.5 h-4 w-4 rounded-full border-2 border-white bg-[#D6336C] shadow"
                style={{ left: `calc(${t.absPercent}% - 8px)` }}
                title={`${t.absPercent.toFixed(1)}%`}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-gray-500">
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </section>

        {/* Tombol ke halaman daftar reward (kalau ada) */}
        <Link href="/rewards" className="px-4">
          <button className="mt-3 bg-[#D6336C] text-white w-full h-[52px] rounded-xl">
            Lihat Reward
          </button>
        </Link>

        {/* === LIST REWARD YANG BISA DIKLAIM === */}
        <div className="p-4 space-y-3">
          {loadingRewards ? (
            <p className="text-sm text-gray-500">Memuat reward…</p>
          ) : rewards.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada reward.</p>
          ) : (
            rewards.map((rw) => (
              <Claim
                key={rw.id}
                reward={rw}
                userId={userId}
                points={points}
                onClaimed={async (cost) => {
                  // kurangi poin di UI dulu
                  setPoints((prev) =>
                    Math.max(prev - (Number(cost) || 0), 0)
                  );
                  // lalu sync dari DB
                  await refreshPoints();
                  await refreshExpiry();
                }}
              />
            ))
          )}
        </div>

        <BottomNavigation />
      </main>
    </div>
  );
}

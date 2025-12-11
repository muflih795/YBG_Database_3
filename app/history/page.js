"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDate(ts) {
  if (!ts) return "-";
  try {
    return new Date(ts).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

/** Hitung tier & progress */
function getTierInfo(points = 0) {
  const max = TIERS[TIERS.length - 1].threshold;
  const absPercent = clamp((points / max) * 100, 0, 100);

  let idx = -1;
  for (let i = 0; i < TIERS.length; i++) if (points >= TIERS[i].threshold) idx = i;

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

export default function HistoryPage() {
  const [userId, setUserId] = useState(null);

  // points / balance
  const [points, setPoints] = useState(0);
  const [loadingPoints, setLoadingPoints] = useState(false);

  // expiry info
  const [expiry, setExpiry] = useState({
    nextDate: null,
    nextAmount: 0,
    soonAmount: 0,
    daysLeft: null,
    loading: false,
  });

  const [rewards, setRewards] = useState([]);
  const [loadingRewards, setLoadingRewards] = useState(false);

  const [history, setHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const getUserId = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      return data?.user?.id ?? null;
    } catch (e) {
      console.error("getUserId error", e);
      return null;
    }
  };

  // refresh points/balance
  const refreshPoints = useCallback(async () => {
    setLoadingPoints(true);
    try {
      const uid = await getUserId();
      setUserId(uid);
      if (!uid) {
        setPoints(0);
        return;
      }
      const { data: pb, error: pbErr } = await supabase
        .from("point_balances")
        .select("balance")
        .eq("user_id", uid)
        .maybeSingle();

      if (pbErr) {
        console.error("point_balances error", pbErr);
        try {
          const res = await fetch("/api/points", { cache: "no-store" });
          const json = await res.json();
          setPoints(Number(json.points ?? 0));
        } catch (e) {
          console.error("fallback /api/points error", e);
          setPoints(0);
        }
      } else {
        setPoints(Number(pb?.balance ?? 0));
      }
    } catch (e) {
      console.error("refreshPoints error", e);
      setPoints(0);
    } finally {
      setLoadingPoints(false);
    }
  }, []);

  const refreshExpiry = useCallback(async () => {
    setExpiry((s) => ({ ...s, loading: true }));
    try {
      const uid = await getUserId();
      if (!uid) {
        setExpiry({ nextDate: null, nextAmount: 0, soonAmount: 0, daysLeft: null, loading: false });
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

      if (error) {
        console.error("expiry query error", error);
        setExpiry({ nextDate: null, nextAmount: 0, soonAmount: 0, daysLeft: null, loading: false });
        return;
      }

      if (!data || data.length === 0) {
        setExpiry({ nextDate: null, nextAmount: 0, soonAmount: 0, daysLeft: null, loading: false });
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
        if (exp.getFullYear() === yyyy && exp.getMonth() === mm && exp.getDate() === dd) {
          nextAmount += Number(row.delta || 0);
        }
        if (exp <= in30) {
          soonAmount += Number(row.delta || 0);
        }
      }

      const daysLeft = Math.ceil((firstDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      setExpiry({
        nextDate: firstDate.toISOString(),
        nextAmount,
        soonAmount,
        daysLeft: Math.max(daysLeft, 0),
        loading: false,
      });
    } catch (e) {
      console.error("refreshExpiry error", e);
      setExpiry({ nextDate: null, nextAmount: 0, soonAmount: 0, daysLeft: null, loading: false });
    }
  }, []);

  const loadRewards = useCallback(async () => {
    setLoadingRewards(true);
    try {
      const { data, error } = await supabase
        .from("rewards")
        .select("id, title, description, image_url, cost, stock, active, created_at")
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("supabase rewards error", error);
        try {
          const res = await fetch("/api/rewards");
          const json = await res.json();
          setRewards(Array.isArray(json) ? json : []);
        } catch (ee) {
          console.error("fallback /api/rewards failed", ee);
          setRewards([]);
        }
      } else {
        setRewards(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("loadRewards error", e);
      setRewards([]);
    } finally {
      setLoadingRewards(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const uid = await getUserId();
      if (!uid) {
        setHistory([]);
        return;
      }

      const { data: rows, error } = await supabase
        .from("user_points")
        .select("id, delta, reason, created_at, expires_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("fetch user_points error", error);
        setHistory([]);
        return;
      }

      const formatted = (rows ?? []).map((row) => {
        const rawDelta = Number(row.delta ?? 0);
        const amount = Math.abs(rawDelta);
        const type = rawDelta >= 0 ? "credit" : "debit";
        const status =
          row.expires_at && new Date(row.expires_at) < new Date() ? "expired" : "active";

        return {
          id: row.id,
          delta: rawDelta,
          amount,
          type,
          description: row.reason ?? null,
          created_at: row.created_at,
          expires_at: row.expires_at,
          status,
        };
      });

      setHistory(formatted);
    } catch (e) {
      console.error("fetchHistory unexpected", e);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshPoints();
      await refreshExpiry();
      await loadRewards();
      await fetchHistory();
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      refreshPoints();
      refreshExpiry();
      loadRewards();
      fetchHistory();
    });

    return () => {
      try {
        authListener?.subscription?.unsubscribe && authListener.subscription.unsubscribe();
        if (authListener?.data?.subscription) authListener.data.subscription.unsubscribe();
      } catch {}
    };
  }, [refreshPoints, refreshExpiry, loadRewards, fetchHistory]);

  const t = getTierInfo(points);

  const overallLoading = loadingPoints || loadingHistory;

  if (overallLoading || history === null) {
    return (
      <main className="mx-auto w-full max-w-[430px] p-4">
        <div className="flex items-center justify-between bg-white shadow p-4 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
            <div className="leading-tight text-sm text-black">
              <p>YB Poin Kamu</p>
              <div className="h-4 w-12 bg-gray-200 animate-pulse rounded" />
              <p>Aktif Hingga …</p>
            </div>
          </div>
          <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
        </div>

        <div className="mt-2 h-6 w-24 bg-gray-100 animate-pulse rounded" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-neutral-100 flex justify-center">
      <main className="w-full min-h-[100dvh] bg-white flex flex-col md:max-w-[430px] md:shadow md:border">
        {/* Header */}
        <div className="flex items-center justify-between bg-white shadow p-4 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Image src="/membership.svg" alt="poin" width={26} height={20} className="w-8 h-8" />
            <div className="leading-tight text-[#D6336C] text-sm">
              <p>YB Poin Kamu</p>
              <h2 className="font-bold">{loadingPoints ? "..." : `${points} Poin`}</h2>
              {expiry.loading ? (
                <p className="text-xs">Mengecek masa berlaku…</p>
              ) : expiry.nextDate ? (
                <p className="text-xs">
                  {expiry.nextAmount} poin <span className="font-semibold">akan hangus</span>{" "}
                  pada {formatDateID(expiry.nextDate)} {typeof expiry.daysLeft === "number" && (
                    <span className="text-gray-600">({expiry.daysLeft} hari lagi)</span>
                  )}
                </p>
              ) : (
                <p className="text-xs">Tidak ada poin yang akan hangus</p>
              )}
            </div>
          </div>

          <Link href="/membership" className="text-[#D6336C] text-sm font-bold">Membership</Link>
        </div>

        {/* Title */}
        <h1 className="text-lg text-black font-semibold p-4">History Poin</h1>

        {/* List */}
        <ul className="mt-1 px-4 space-y-2 pb-6">
          {(!history || history.length === 0) && (
            <li className="text-sm text-gray-500 px-2">Belum ada riwayat poin.</li>
          )}

          {history.map((tx) => {
            const isCredit = Number(tx.delta ?? tx.amount ?? 0) >= 0 || tx.type === "credit";
            const amount = Math.abs(Number(tx.delta ?? tx.amount ?? 0));
            const statusExpired = tx.expires_at ? new Date(tx.expires_at) < new Date() : false;

            return (
              <li
                key={tx.id}
                className="bg-white rounded-xl shadow p-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm text-black font-medium">
                    {isCredit ? "Poin Masuk" : "Poin Terpakai"}
                    {tx.description ? ` · ${tx.description}` : ""}
                  </div>
                  <div className="text-xs text-black">
                    {formatDate(tx.created_at)}
                    {isCredit && tx.expires_at && (
                      <>
                        {" · Exp: "}
                        {formatDate(tx.expires_at)}
                        {statusExpired && (
                          <span className="ml-2 text-red-600 font-semibold">Hangus</span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className={`text-sm font-semibold ${isCredit ? "text-emerald-600" : "text-pink-600"}`}>
                  {isCredit ? `+${amount}` : `-${amount}`}
                </div>
              </li>
            );
          })}
        </ul>
        <BottomNavigation />
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import BannerCarousel from "../components/bannerCarousel";
import HorizontalProductList from "../components/productCard";
import BottomNavigation from "../components/bottomnav";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const supabase = supabaseBrowser;

// Definisi tier sama seperti Membership
const TIERS = [
  { id: "friend",  name: "FRIEND",  threshold: 25 },
  { id: "bestie",  name: "BESTIE",  threshold: 50 },
  { id: "sisters", name: "SISTERS", threshold: 100 },
];

function getTierFromPoints(points) {
  if (points < TIERS[0].threshold) return "—";
  let current = TIERS[0];
  for (const t of TIERS) {
    if (points >= t.threshold) current = t;
  }
  return current.name;
}

export default function Beranda() {
  const [name, setName] = useState("User");
  const [tier, setTier] = useState("—");
  const [points, setPoints] = useState(0);

  // --- ambil user login ---
  const loadUser = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("getUser error:", error);
        setName("User");
        setTier("—");
        setPoints(0);
        return null;
      }

      const user = data?.user ?? null;
      if (!user) {
        setName("User");
        setTier("—");
        setPoints(0);
        return null;
      }

      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        (user.email ? user.email.split("@")[0] : "User");

      setName(displayName);
      return user.id;
    } catch (e) {
      console.error("loadUser failed:", e);
      setName("User");
      setTier("—");
      setPoints(0);
      return null;
    }
  }, []);

  // --- ambil poin dari tabel user_points (SAMA dengan Membership) ---
  const loadPoints = useCallback(async (userId) => {
    try {
      if (!userId) {
        setPoints(0);
        setTier("—");
        return;
      }

      const { data, error } = await supabase
        .from("user_points")
        .select("delta, expires_at")
        .eq("user_id", userId);

      if (error || !Array.isArray(data)) {
        console.error("user_points error:", error);
        setPoints(0);
        setTier("—");
        return;
      }

      const now = new Date();
      let total = 0;

      data.forEach((row) => {
        const delta = Number(row.delta || 0);

        // delta positif yg sudah expired di-skip
        if (delta > 0 && row.expires_at) {
          const exp = new Date(row.expires_at);
          if (exp < now) return;
        }

        total += delta;
      });

      setPoints(total);
      setTier(getTierFromPoints(total));
    } catch (e) {
      console.error("loadPoints failed:", e);
      setPoints(0);
      setTier("—");
    }
  }, []);

  // --- efek awal + listen perubahan auth ---
  useEffect(() => {
    (async () => {
      const uid = await loadUser();
      await loadPoints(uid);
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async () => {
        const uid = await loadUser();
        await loadPoints(uid);
      }
    );

    return () => {
      try {
        authListener?.subscription?.unsubscribe?.();
      } catch {
        // ignore
      }
    };
  }, [loadUser, loadPoints]);

  return (
    <div className="min-h-[100dvh] bg-neutral-100 flex justify-center">
      <main className="w-full min-h-[100dvh] bg-white flex flex-col md:max-w-[430px] md:shadow md:border overflow-y-auto pb-[80px]">
        {/* Top bar */}
        <div className="flex items-center justify-between bg-white shadow p-4 sticky top-0 z-10">
          <h2 className="text-[#D6336C] p-5 py-3">Dear, {name}</h2>

          <div className="flex items-center gap-2">
            <Image
              src="/membership.svg"
              alt="poin"
              width={26}
              height={20}
              className="w-8 h-8"
            />
            <div className="leading-tight text-[#D6336C] text-sm">
              <p>YBG Tier Kamu</p>
              <h2 className="font-bold">{tier}</h2>
            </div>
          </div>

          <div className="text-[#D6336C] text-sm leading-tight">
            <p>Poin Kamu</p>
            <h2 className="font-bold">{points}</h2>
          </div>

          <Link
            href="/cart"
            aria-label="Keranjang"
            title="Keranjang"
            className="p-2 rounded-full border border-pink-200 text-pink-600 hover:bg-pink-50 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M7 18a2 2 0 1 0 2 2a2 2 0 0 0-2-2m10 0a2 2 0 1 0 2 2a2 2 0 0 0-2-2M7.2 14h9.45a2 2 0 0 0 1.92-1.47L20.8 7H6.21L5.27 4H2v2h2.27z"
              />
            </svg>
          </Link>
        </div>

        {/* Banner */}
        <div className="w-full">
          <BannerCarousel />
        </div>

        {/* List Product */}
        <div className="mt-2 mb-4">
          <HorizontalProductList title="YBG Exclusive" table="ybg_exclusive" />
        </div>

        <div className="mb-6">
          <HorizontalProductList
            title="Upcoming Product on YBG"
            source="upcoming"
          />
        </div>

        <BottomNavigation />
      </main>
    </div>
  );
}

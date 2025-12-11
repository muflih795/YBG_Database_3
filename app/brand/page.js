"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import BottomNavigation from "../components/bottomnav";
import { fetchBrands } from "@/lib/repos";

export default function BrandPage() {
  const [brands, setBrands] = useState(null);
  const [q, setQ] = useState("");
  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchBrands();
        setBrands(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error("Gagal memuat brand:", e);
        setBrands([]);
      }
    })();
  }, []);

  const processed =
    Array.isArray(brands) && brands.length > 0
      ? [...brands]
          .filter((b) =>
            (b?.name || "").toLowerCase().includes(q.toLowerCase())
          )
          .sort((a, b) => {
            const an = (a.name || "").toLowerCase();
            const bn = (b.name || "").toLowerCase();
            return sortDir === "asc"
              ? an.localeCompare(bn)
              : bn.localeCompare(an);
          })
      : [];

  return (
    <div className="min-h-[100dvh] bg-neutral-100 flex justify-center">
      <main className="w-full min-h-[100dvh] bg-white md:max-w-[430px] md:shadow md:border flex flex-col pb-[80px]">
        
        {/* Header */}
        <div className="sticky top-0 bg-white px-4 py-3 shadow flex items-center justify-between gap-3 z-10">
          <h1 className="text-[#D6336C] font-semibold">Brand</h1>
          <Link href="/product" className="text-sm text-[#D6336C]">
            Semua Produk
          </Link>
        </div>

        {/* List Brand */}
        <section className="px-4 py-4">
          <h2 className="text-base font-semibold text-[#D6336C] mb-3">
            Pilih Brand
          </h2>

          {/* Search + Sort */}
          <div className="flex items-center gap-3 mb-4">
            
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Cari brand..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="
                  w-full
                  rounded-full
                  border border-gray-200
                  bg-white
                  px-4 py-2
                  text-sm
                  placeholder:text-gray-400
                  focus:outline-none
                  focus:ring-1
                  focus:ring-[#D6336C]
                "
              />
            </div>

            {/* Sort A-Z / Z-A */}
            <div className="shrink-0">
              <div className="relative">
                <select
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value)}
                  className="
                    appearance-none
                    rounded-full
                    border border-[#D6336C]
                    px-4 pr-8
                    py-2
                    text-xs
                    font-semibold
                    text-[#D6336C]
                    bg-white
                    focus:outline-none
                  "
                >
                  <option value="asc">A-Z</option>
                  <option value="desc">Z-A</option>
                </select>

                {/* icon panah */}
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#D6336C] text-[10px]">
                  ▼
                </span>
              </div>
            </div>
          </div>

          {/* Brand list */}
          {brands === null ? (
            // skeleton
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="w-full">
                  <div className="w-full aspect-square rounded-2xl bg-gray-100 animate-pulse" />
                  <div className="w-16 h-3 mt-2 rounded bg-gray-100 animate-pulse mx-auto" />
                </div>
              ))}
            </div>
          ) : processed.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-10">
              Brand tidak ditemukan.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {processed.map((b, i) => {
                const logo =
                  typeof b?.logoSrc === "string" && b.logoSrc.trim().length > 0
                    ? b.logoSrc
                    : "/brand/brand-placeholder.svg";

                return (
                  <Link
                    key={b.id}
                    href={`/product/${b.slug}`}
                    className="w-full"
                    title={b.name}
                  >
                    <div className="w-full aspect-square rounded-2xl border border-pink-100 bg-white grid place-items-center overflow-hidden">
                      <Image
                        src={logo}
                        alt={b.name || "Brand"}
                        width={96}
                        height={96}
                        className="object-contain"
                        priority={i < 3}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#B6B6B6] text-center truncate">
                      {b.name || "Brand"}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <BottomNavigation />
      </main>
    </div>
  );
}

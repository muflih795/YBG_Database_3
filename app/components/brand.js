"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
const supabase = supabaseBrowser;

// Jika logo_url adalah path relatif (misal "brand/balenciaga.png"),
// otomatis tambahkan "/" di depan supaya Next/Image tidak error.
// Jika sudah absolute URL (http/https), biarkan saja.
function getImageUrl(path) {
  if (!path) return "/brand/brand-placeholder.svg";
  if (path.startsWith("http")) return path;
  if (!path.startsWith("/")) return "/" + path;
  return path;
}

export default function BrandCarousel({ title = "Brand" }) {
  const [brands, setBrands] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("brands")
          .select("id, nama, slug, logo_url, is_active")
          .eq("is_active", true)
          .order("nama", { ascending: true });

        if (error) throw error;
        setBrands(data || []);
      } catch (e) {
        console.error("Brand load error:", e);
        setBrands([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="w-full">
      <div className="flex items-baseline justify-between px-4">
        <h2 className="text-[18px] font-bold text-black">{title}</h2>
        <Link href="/brands" className="text-sm text-[#D6336C]">Lihat Semua</Link>
      </div>

      <ul className="mt-2 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
        <style jsx>{`ul::-webkit-scrollbar { display: none; }`}</style>

        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="w-[90px]">
                <div className="w-[90px] h-[90px] rounded-2xl bg-gray-200 animate-pulse" />
                <div className="w-14 h-3 rounded bg-gray-200 mt-2 mx-auto animate-pulse" />
              </li>
            ))
          : brands.map((b, i) => (
              <li key={b.id} className="shrink-0 w-[90px] snap-start">
                <Link href={`/product/${b.slug}`} className="block text-center">
                  <div className="relative w-[90px] h-[90px] rounded-2xl bg-white ring-1 ring-pink-100 grid place-items-center overflow-hidden">
                    <Image
                      src={getImageUrl(b.logo_url)}
                      alt={b.nama}
                      fill
                      className="object-contain p-3"
                      sizes="90px"
                      priority={i === 0}
                    />
                  </div>
                  <p className="text-[12px] mt-2 text-gray-700 line-clamp-1">
                    {b.nama}
                  </p>
                </Link>
              </li>
            ))}
      </ul>
    </section>
  );
}

"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
const supabase = supabaseBrowser;

/**
 * props:
 * - title: judul section
 * - source: "exclusive" | "upcoming" (default: "exclusive")
 */
export default function HorizontalProductList({ title, source = "exclusive" }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function fetchProducts() {
      try {
        let data, error;

        if (source === "upcoming") {
          // ybg_upcoming (id = UUID, price opsional)
          ({ data, error } = await supabase
            .from("ybg_upcoming")
            .select("id, nama, image_url, image_urls, deskripsi, brand_slug, kategori, price, created_at")
            .order("created_at", { ascending: false }));
        } else {
          // ybg_exclusive
          ({ data, error } = await supabase
            .from("ybg_exclusive")
            .select("id, nama, image_url, image_urls, price, brand_slug, kategori, deskripsi, created_at")
            .order("created_at", { ascending: false }));
        }

        if (error) throw error;
        if (!alive) return;
        setProducts(data || []);
      } catch (err) {
        console.error(`Fetch ${source} error:`, err);
        if (!alive) return;
        setProducts([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchProducts();
    return () => { alive = false; };
  }, [source]);

  if (loading)
    return (
      <div className="px-4">
        <h2 className="text-[#D6336C] font-semibold mb-2">{title}</h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-[140px] h-[180px] bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );

  if (products.length === 0) return null;

  return (
    <div className="px-4">
      <h2 className="text-[#D6336C] font-semibold mb-2">{title}</h2>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {products.map((p) => {
          // tujuan detail: /product/exclusive/:id atau /product/upcoming/:id
          const slugSegment = source === "upcoming" ? "upcoming" : "exclusive";
          const href = `/product/${slugSegment}/${p.id}`;

          return (
            <Link
              key={p.id}
              href={href}
              className="min-w-[140px] max-w-[140px] bg-white rounded-xl border shadow-sm overflow-hidden shrink-0"
            >
              <div className="relative w-full h-[160px]">
                <Image
                  src={p.image_url || "/placeholder.png"}
                  alt={p.nama}
                  fill
                  sizes="(max-width: 430px) 140px"
                  className="object-cover"
                />
              </div>
              <div className="p-2">
                <p className="text-[13px] font-medium text-gray-900 line-clamp-2">{p.nama}</p>
                {typeof p.price === "number" && source !== "upcoming" && (
                  <p className="text-[12px] text-[#D6336C] font-semibold mt-1">
                    Rp {Number(p.price).toLocaleString("id-ID")}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

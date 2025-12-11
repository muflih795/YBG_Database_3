"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
const supabase = supabaseBrowser;


const formatIDR = (v) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

const pretty = (s = "") =>
  s.replace(/[-_]+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());

export default function ProductBySlugPage() {
  const { slug: raw } = useParams();
  const router = useRouter();
  const slug = useMemo(
    () => decodeURIComponent(Array.isArray(raw) ? raw[0] : raw || "").toLowerCase().trim(),
    [raw]
  );

  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  // search + sort (default | termurah | termahal)
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("default");

  // dropdown state
  const [openFilter, setOpenFilter] = useState(false);
  const filterRef = useRef(null);

  // close dropdown on click outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (!filterRef.current) return;
      if (!filterRef.current.contains(e.target)) setOpenFilter(false);
    };
    if (openFilter) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openFilter]);

  // debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // fetch
  useEffect(() => {
    if (!slug) return;
    let alive = true;

    (async () => {
      try {
        let q = supabase
          .from("products")
          .select(
            "id,nama,brand_slug,kategori,price,image_url,image_urls,deskripsi,is_active,status,date_created"
          )
          .eq("status", "published")
          .eq("is_active", true)
          .or(`brand_slug.eq.${slug},kategori.eq.${slug}`);

        if (debouncedSearch) q = q.ilike("nama", `%${debouncedSearch}%`);

        if (sort === "termurah") {
          q = q.order("price", { ascending: true, nullsFirst: true });
        } else if (sort === "termahal") {
          q = q.order("price", { ascending: false, nullsFirst: false });
        } else {
          q = q.order("date_created", { ascending: false });
        }

        const { data, error } = await q;
        if (error) throw error;
        if (!alive) return;
        setItems(Array.isArray(data) ? data : []);
        setError("");
      } catch (e) {
        if (!e?.message) console.error(e);
        setItems([]);
        setError(e.message || "Gagal memuat produk");
      }
    })();

    return () => {
      alive = false;
    };
  }, [slug, debouncedSearch, sort]);

  const heading = slug ? pretty(slug) : "Product";
  const sortLabel =
    sort === "termurah" ? "Termurah" : sort === "termahal" ? "Termahal" : "Terbaru";

  return (
    <div className="min-h-[100dvh] bg-neutral-100 flex justify-center">
      <main className="w-full min-h-[100dvh] bg-white md:max-w-[430px] md:shadow md:border flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white px-4 py-3 shadow flex items-center justify-between gap-3 z-10">
          <button onClick={() => router.back()}>
            <Image src="/back.svg" alt="back" width={14} height={14} className="w-9 h-7 pr-3" />
          </button>
          <h1 className="text-[#D6336C] font-semibold">{heading}</h1>
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

        {/* Search + Filter dropdown */}
        <div className="px-4 pt-3 relative mb-4" ref={filterRef}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari produk…"
                className="w-full border rounded-full px-4 py-2 text-[#D6336C] pr-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-xs"
                  aria-label="Bersihkan pencarian"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => setOpenFilter((v) => !v)}
              className="px-3 h-9 rounded-full border text-sm border-gray-300 text-gray-700 flex items-center gap-2"
              aria-haspopup="menu"
              aria-expanded={openFilter}
              title="Filter harga"
            >
              {/* icon funnel */}
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M3 5h18v2H3zm4 6h10v2H7zm3 6h4v2h-4z"
                />
              </svg>
              <span>{sortLabel}</span>
            </button>
          </div>

          {/* dropdown panel */}
          {openFilter && (
            <div
              role="menu"
              className="absolute right-4 mt-2 w-44 rounded-xl border bg-white shadow z-20 overflow-hidden"
            >
              <button
                onClick={() => {
                  setSort("termurah");
                  setOpenFilter(false);
                }}
                className={`w-full text-left text-sm px-4 py-2 hover:bg-pink-50 ${
                  sort === "termurah" ? "text-pink-600 font-medium" : "text-gray-800"
                }`}
                role="menuitem"
              >
                Termurah → Termahal
              </button>
              <button
                onClick={() => {
                  setSort("termahal");
                  setOpenFilter(false);
                }}
                className={`w-full text-left text-sm px-4 py-2 hover:bg-pink-50 ${
                  sort === "termahal" ? "text-pink-600 font-medium" : "text-gray-800"
                }`}
                role="menuitem"
              >
                Termahal → Termurah
              </button>
              <div className="h-px bg-gray-200" />
              <button
                onClick={() => {
                  setSort("default");
                  setOpenFilter(false);
                }}
                className={`w-full text-left text-sm px-4 py-2 hover:bg-pink-50 ${
                  sort === "default" ? "text-pink-600 font-medium" : "text-gray-800"
                }`}
                role="menuitem"
              >
                Reset (Terbaru)
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        {items === null ? (
          <div className="px-4 py-6 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[210px] bg-gray-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="px-4 py-10 text-center text-sm text-rose-600">Error: {error}</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-600">
            Tidak ada produk untuk: <b>{heading}</b>{" "}
            {debouncedSearch && <>/ “{debouncedSearch}”</>}.{" "}
            <button onClick={() => setSearch("")} className="text-[#D6336C] underline">
              Hapus pencarian
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4 pb-6">
            {items.map((p) => {
              const img = p.image_url || "/placeholder.png";
              return (
                <Link
                  key={p.id}
                  href={`/product/${slug}/${p.id}`}
                  className="block bg-white rounded-xl shadow-sm border overflow-hidden"
                >
                  <div className="relative w-full h-[160px]">
                    <Image
                      src={img}
                      alt={p.nama}
                      fill
                      sizes="(max-width: 430px) 50vw, 200px"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-[13px] text-black line-clamp-2">{p.nama}</p>
                    {typeof p.price === "number" && (
                      <p className="text-[12px] text-[#D6336C] font-semibold mt-1">
                        {formatIDR(p.price)}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

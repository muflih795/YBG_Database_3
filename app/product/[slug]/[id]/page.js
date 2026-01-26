"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import ImageCarousel from "@/app/components/ImageCarousel";

const supabase = supabaseBrowser;

const formatIDR = (v) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

// ✅ Ambil dari env, tapi akan divalidasi di handleBuyNow
const WA_SA_RAW = process.env.NEXT_PUBLIC_SA_WA_NUMBER;

function isColumnMissingError(err) {
  const msg = (err?.message || "").toLowerCase();
  return msg.includes("does not exist") && (msg.includes("stock") || msg.includes("stok"));
}

async function safeSelectSingle(table, colsWithStock, colsWithoutStock, filters = []) {
  let q1 = supabase.from(table).select(colsWithStock);
  for (const f of filters) q1 = f(q1);
  const r1 = await q1.maybeSingle();

  if (!r1.error) return { data: r1.data, error: null, usedStock: true };

  if (isColumnMissingError(r1.error)) {
    let q2 = supabase.from(table).select(colsWithoutStock);
    for (const f of filters) q2 = f(q2);
    const r2 = await q2.maybeSingle();
    return { data: r2.data, error: r2.error || null, usedStock: false };
  }

  return { data: null, error: r1.error, usedStock: false };
}

export default function ProductDetailPage() {
  const { id: rawId, slug: rawSlug } = useParams();
  const router = useRouter();

  const id = useMemo(() => (Array.isArray(rawId) ? rawId[0] : rawId) || "", [rawId]);
  const slug = useMemo(() => (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug) || "", [rawSlug]);

  const isUpcoming = slug === "upcoming" || slug === "ybg_upcoming";

  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [source, setSource] = useState("");
  const [adding, setAdding] = useState(false);

  const cartSource = useMemo(() => {
    if (isUpcoming) return "";
    return source === "exclusive" ? "ybg_exclusive" : "products";
  }, [isUpcoming, source]);

  useEffect(() => {
    if (!id) return;
    let alive = true;

    (async () => {
      try {
        if (isUpcoming) {
          const idStr = decodeURIComponent(String(id || ""));
          const { data, error } = await supabase
            .from("ybg_upcoming")
            .select("id,nama,deskripsi,image_url,image_urls")
            .eq("id", idStr)
            .maybeSingle();

          if (!alive) return;
          if (error) throw error;

          if (!data) {
            setItem(null);
            setError("Produk belum tersedia atau tidak ditemukan");
          } else {
            setItem(data);
            setSource("upcoming");
            setError("");
          }
          return;
        }

        const colsWithStock = [
          "id",
          "nama",
          "brand_slug",
          "kategori",
          "price",
          "image_url",
          "image_urls",
          "deskripsi",
          "status",
          "is_active",
          "stock",
        ].join(",");

        const colsWithoutStock = [
          "id",
          "nama",
          "brand_slug",
          "kategori",
          "price",
          "image_url",
          "image_urls",
          "deskripsi",
          "status",
          "is_active",
        ].join(",");

        // coba exclusive dulu
        const ex = await safeSelectSingle("ybg_exclusive", colsWithStock, colsWithoutStock, [
          (q) => q.eq("id", id),
          (q) => q.ilike("status", "published"), // ✅ case-insensitive
          (q) => q.eq("is_active", true),
        ]);

        if (!alive) return;

        if (!ex.error && ex.data) {
          setItem(ex.data);
          setSource("exclusive");
          setError("");
          return;
        }

        // fallback ke products
        const pr = await safeSelectSingle("products", colsWithStock, colsWithoutStock, [
          (q) => q.eq("id", id),
          (q) => q.ilike("status", "published"), // ✅ case-insensitive
          (q) => q.eq("is_active", true),
        ]);

        if (!alive) return;
        if (pr.error) throw pr.error;

        if (!pr.data) {
          setItem(null);
          setError("Produk tidak ditemukan");
        } else {
          setItem(pr.data);
          setSource("products");
          setError("");
        }
      } catch (e) {
        if (!alive) return;
        setItem(null);
        setError(e?.message || "Produk tidak ditemukan");
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, isUpcoming]);

  function buildGallery(rec) {
    if (!rec) return [];
    let arr = [];
    if (Array.isArray(rec.image_urls)) arr = rec.image_urls;
    else if (typeof rec.image_urls === "string" && rec.image_urls.trim()) {
      try {
        const parsed = JSON.parse(rec.image_urls);
        if (Array.isArray(parsed)) arr = parsed;
      } catch {}
    }
    const urls = [...(rec.image_url ? [rec.image_url] : []), ...arr.filter(Boolean)];
    return [...new Set(urls)];
  }

  function StockBadge(it) {
    const qty = Number.isFinite(it?.stock) ? it.stock : null;
    const ok = it?.is_active === true && String(it?.status || "").toLowerCase() === "published" && qty !== null && qty > 0;

    return (
      <span
        className={`px-2 py-1 text-[11px] rounded-md border ${
          ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
        }`}
      >
        {qty === null ? "Stok: Tidak tersedia" : qty > 0 ? `Stok: ${qty}` : "Stok: Habis"}
      </span>
    );
  }

  function isAvailable(it) {
    const qty = Number.isFinite(it?.stock) ? it.stock : null;
    return it?.is_active === true && String(it?.status || "").toLowerCase() === "published" && qty !== null && qty > 0;
  }

  async function handleAddToCart() {
    try {
      if (!item || isUpcoming) return;

      const maxStock = Number.isFinite(item?.stock) ? item.stock : null;
      if (maxStock === null) throw new Error("Stok tidak tersedia.");
      if (maxStock <= 0) throw new Error("Stok habis.");

      setAdding(true);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userData?.user?.id;
      if (!uid) throw new Error("Silakan login terlebih dahulu.");

      const { data: found, error: selErr } = await supabase
        .from("cart_items")
        .select("id, qty")
        .eq("user_id", uid)
        .eq("source", cartSource)
        .eq("product_id", item.id)
        .maybeSingle();

      if (selErr) throw selErr;

      if (found?.id) {
        const nextQty = (found.qty || 1) + 1;
        if (nextQty > maxStock) throw new Error("Jumlah melebihi stok yang tersedia.");

        const { error: updErr } = await supabase.from("cart_items").update({ qty: nextQty }).eq("id", found.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase.from("cart_items").insert({
          user_id: uid,
          source: cartSource,
          product_id: item.id,
          qty: 1,
        });
        if (insErr) throw insErr;
      }

      alert("Produk masuk ke keranjang.");
    } catch (e) {
      alert(e?.message || "Gagal menambahkan ke keranjang.");
    } finally {
      setAdding(false);
    }
  }

  // ✅ FIX WA: jangan sampai /undefined
  function handleBuyNow() {
    if (!item || isUpcoming) return;

    if (!isAvailable(item)) {
      alert("Stok tidak tersedia / habis.");
      return;
    }

    // Ambil nomor WA dari env, bersihkan non-digit
    const wa = String(WA_SA_RAW || "").replace(/\D/g, "");
    if (!wa) {
      alert("Nomor WhatsApp admin belum diatur. Set NEXT_PUBLIC_SA_WA_NUMBER di environment (contoh: 62812xxxxxxx).");
      return;
    }

    const title = item?.nama || "Produk";
    const price = typeof item?.price === "number" ? formatIDR(item.price) : "-";
    const link = typeof window !== "undefined" ? window.location.href : "";

    const message =
      `Halo Kak, saya mau beli:\n\n` +
      `• ${title}\n` +
      `• Harga: ${price}\n` +
      `• Link: ${link}\n\n` +
      `Mohon dibantu ya.`;

    // ✅ lebih stabil ketimbang wa.me
    const url = `https://api.whatsapp.com/send?phone=${wa}&text=${encodeURIComponent(message)}`;
    window.location.href = url;
  }

  return (
    <div className="min-h-[100dvh] bg-neutral-100 flex justify-center">
      <main className="relative w-full min-h-[100dvh] bg-white md:max-w-[430px] md:shadow md:border flex flex-col pb-24">
        <div className="sticky top-0 z-20 bg-white px-4 py-3 shadow flex items-center justify-between">
          <button onClick={() => router.back()} aria-label="Kembali">
            <Image src="/back.svg" alt="Kembali" width={14} height={14} className="w-9 h-7 pr-3" />
          </button>
          <h1 className="text-[#D6336C] font-semibold">{isUpcoming ? "Upcoming Product" : "Product"}</h1>
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

        {error ? (
          <div className="px-4 py-10 text-sm">
            <p className="text-rose-600">{error}</p>
            <Link href={`/product/${isUpcoming ? "upcoming" : slug}`} className="text-[#D6336C] underline">
              Kembali ke daftar
            </Link>
          </div>
        ) : !item ? (
          <div className="p-4">
            <div className="h-[260px] bg-gray-100 animate-pulse rounded-xl" />
            <div className="mt-3 h-5 w-2/3 bg-gray-100 animate-pulse rounded" />
            <div className="mt-2 h-4 w-1/3 bg-gray-100 animate-pulse rounded" />
          </div>
        ) : (
          <>
            <div className="px-4 pt-4">
              <ImageCarousel urls={buildGallery(item)} alt={item.nama || "Foto"} height={340} objectFit="contain" />
            </div>

            <div className="px-4 mt-3 flex items-center justify-between">
              <p className="text-[18px] font-bold text-[#D6336C] leading-none">
                {typeof item.price === "number" ? formatIDR(item.price) : ""}
              </p>
              {StockBadge(item)}
            </div>

            <div className="px-4 mt-1">
              <p className="text-[15px] font-semibold text-black">{item.nama}</p>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] text-rose-600 border-rose-200">
                After Care Warranty
              </div>
            </div>

            <section className="px-4 mt-3">
              <div className="rounded-xl border shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <h3 className="font-semibold text-[14px] text-gray-700">Detail Product</h3>
                </div>
                <div className="px-4 py-3 space-y-2 text-[12.5px]">
                  <ul className="space-y-1 text-gray-700">
                    <li>
                      <span className="text-gray-500">Type of Product</span>: {item.kategori || "-"}
                    </li>
                    {item.brand_slug && (
                      <li>
                        <span className="text-gray-500">Brand</span>: {item.brand_slug}
                      </li>
                    )}
                  </ul>
                  {item.deskripsi && (
                    <p className="mt-2 text-gray-700 leading-relaxed whitespace-pre-line">{item.deskripsi}</p>
                  )}
                </div>
              </div>
            </section>

            <div className="fixed bottom-0 left-0 right-0 z-30">
              <div className="mx-auto w-full md:max-w-[430px] bg-white border-t p-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className="h-11 rounded-xl border border-rose-200 text-[#D6336C] text-sm font-medium disabled:opacity-60"
                    onClick={handleAddToCart}
                    disabled={adding || !isAvailable(item)}
                  >
                    {adding ? "Menambahkan..." : "Tambah Wishlist"}
                  </button>

                  {isAvailable(item) ? (
                    <button className="h-11 rounded-xl bg-[#D6336C] text-white" onClick={handleBuyNow}>
                      Beli Sekarang
                    </button>
                  ) : (
                    <button className="h-11 rounded-xl bg-gray-200 text-gray-500 cursor-not-allowed">Stok Habis</button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

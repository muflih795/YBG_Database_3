"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
const supabase = supabaseBrowser;
import ImageCarousel from "@/app/components/ImageCarousel";


const formatIDR = (v) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

const WA_SA = process.env.NEXT_PUBLIC_SA_WA_NUMBER

export default function ProductDetailPage() {
  const { id: rawId, slug: rawSlug } = useParams();
  const router = useRouter();

  const id = useMemo(() => (Array.isArray(rawId) ? rawId[0] : rawId) || "", [rawId]);
  const slug = useMemo(() => (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug) || "", [rawSlug]);
  const isUpcoming = slug === "upcoming" || slug === "ybg_upcoming";

  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [source, setSource] = useState(""); // "upcoming" | "exclusive" | "products"
  const [adding, setAdding] = useState(false); 

  // sumber cart untuk produk normal
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

          if (error) throw error;
          if (!alive) return;

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

        const cols = [
          "id","nama","brand_slug","kategori","price","image_url","image_urls","deskripsi","status","is_active"
        ].join(",");

        let { data, error } = await supabase
          .from("ybg_exclusive")
          .select(cols)
          .eq("id", id)
          .eq("status", "published")
          .eq("is_active", true)
          .maybeSingle();

        if (!error && !data) {
          const r2 = await supabase
            .from("products")
            .select(cols)
            .eq("id", id)
            .eq("status", "published")
            .eq("is_active", true)
            .maybeSingle();
          data = r2.data;
          error = r2.error;
          if (data) setSource("products");
        } else if (data) {
          setSource("exclusive");
        }

        if (error) throw error;
        if (!alive) return;

        if (!data) {
          setItem(null);
          setError("Produk tidak ditemukan");
        } else {
          setItem(data);
          setError("");
        }
      } catch (e) {
        if (!alive) return;
        setItem(null);
        setError(e?.message || "Produk tidak ditemukan");
      }
    })();

    return () => { alive = false; };
  }, [id, isUpcoming]);

  // handler: Tambah Wishlist -> cart_items
  async function handleAddToCart() {
    try {
      if (!item || isUpcoming) return;
      setAdding(true);

      // harus login
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userData?.user?.id;
      if (!uid) throw new Error("Silakan login terlebih dahulu.");

      // cek existing
      const { data: found, error: selErr } = await supabase
        .from("cart_items")
        .select("id, qty")
        .eq("user_id", uid)
        .eq("source", cartSource)
        .eq("product_id", item.id)
        .maybeSingle();
      if (selErr) throw selErr;

      if (found?.id) {
        const { error: updErr } = await supabase
          .from("cart_items")
          .update({ qty: (found.qty || 1) + 1 })
          .eq("id", found.id);
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

  // handler: Beli Sekarang -> WhatsApp SA
  function handleBuyNow() {
    if (!item || isUpcoming) return;
    const title = item?.nama || "Produk";
    const price = typeof item?.price === "number" ? formatIDR(item.price) : "-";
    const link =
      typeof window !== "undefined" ? window.location.href : `https://wa.me/${WA_SA}`;
    const message = `Halo Kak, saya mau beli:\n\n• ${title}\n• Harga: ${price}\n• Sumber: ${source || "-"}\n• Link: ${link}\n\nMohon dibantu ya.`;
    const waUrl = `https://wa.me/${WA_SA}?text=${encodeURIComponent(message)}`;
    window.location.href = waUrl;
  }

  function buildGallery(rec) {
    let arr = [];
    if (!rec) return arr;
    if (Array.isArray(rec.image_urls)) arr = rec.image_urls;
    else if (typeof rec.image_urls === "string" && rec.image_urls.trim()) {
      try { const parsed = JSON.parse(rec.image_urls); if (Array.isArray(parsed)) arr = parsed; } catch {}
    }
    const urls = [...(rec.image_url ? [rec.image_url] : []), ...arr.filter(Boolean)];
    return [...new Set(urls)];
  }

  function StockBadge(it) {
    const ready = it?.is_active === true && it?.status === "published";
    return (
      <span className={`px-2 py-1 text-[11px] rounded-md border ${
        ready ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
      }`}>
        Stok : {ready ? "Ready" : "Tidak Ready"}
      </span>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-neutral-100 flex justify-center">
      <main className="relative w-full min-h-[100dvh] bg-white md:max-w-[430px] md:shadow md:border flex flex-col pb-24">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white px-4 py-3 shadow flex items-center justify-between">
          <button onClick={() => router.back()} aria-label="Kembali">
            <Image src="/back.svg" alt="Kembali" width={14} height={14} className="w-9 h-7 pr-3" />
          </button>
          <h1 className="text-[#D6336C] font-semibold">{isUpcoming ? "Upcoming Product" : "Product"}</h1>
          <Link href="/cart" aria-label="Keranjang" title="Keranjang"
            className="p-2 rounded-full border border-pink-200 text-pink-600 hover:bg-pink-50 transition">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M7 18a2 2 0 1 0 2 2a2 2 0 0 0-2-2m10 0a2 2 0 1 0 2 2a2 2 0 0 0-2-2M7.2 14h9.45a2 2 0 0 0 1.92-1.47L20.8 7H6.21L5.27 4H2v2h2.27z"/>
            </svg>
          </Link>
        </div>

        {/* State */}
        {error ? (
          <div className="px-4 py-10 text-sm">
            <p className="text-rose-600">{error}</p>
            <Link
              href={`/product/${isUpcoming ? "upcoming" : slug}`}
              className="text-[#D6336C] underline">
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
            {/* Gallery */}
            <div className="px-4 pt-4">
              <ImageCarousel
                urls={buildGallery(item)}
                alt={item.nama || "Foto"}
                height={isUpcoming ? 360 : 340}
                objectFit="contain"
              />
            </div>

            {/* Upcoming */}
            {isUpcoming ? (
              <>
                <div className="px-4 mt-3">
                  <p className="text-[16px] font-semibold text-black">{item.nama || "Upcoming Item"}</p>
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] text-rose-600 border-rose-200">
                    Coming Soon
                  </div>
                </div>

                <section className="px-4 mt-3">
                  <div className="rounded-xl border shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50">
                      <h3 className="font-semibold text-[14px] text-gray-700">Deskripsi</h3>
                    </div>
                    <div className="px-4 py-3 text-[13px] text-gray-700 whitespace-pre-line">
                      {item.deskripsi || "Detail akan diumumkan saat rilis."}
                    </div>
                  </div>
                  <p className="mt-3 text-[12px] text-gray-500">
                    Produk ini belum tersedia untuk dibeli. Nantikan tanggal rilisnya ya!
                  </p>
                </section>
              </>
            ) : (
              /* Detail normal */
              <>
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
                        <li><span className="text-gray-500">Type of Product</span>: {item.kategori || "-"}</li>
                        {item.brand_slug && <li><span className="text-gray-500">Brand</span>: {item.brand_slug}</li>}
                      </ul>
                      {item.deskripsi && (
                        <p className="mt-2 text-gray-700 leading-relaxed whitespace-pre-line">{item.deskripsi}</p>
                      )}
                    </div>
                  </div>
                </section>

                {/* Bottom Actions */}
                <div className="fixed bottom-0 left-0 right-0 z-30">
                  <div className="mx-auto w-full md:max-w-[430px] bg-white border-t p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        className="h-11 rounded-xl border border-rose-200 text-[#D6336C] text-sm font-medium disabled:opacity-60"
                        onClick={handleAddToCart}
                        disabled={adding || !item?.is_active}
                      >
                        {adding ? "Menambahkan..." : "Tambah Wishlist"}
                      </button>

                      {item.is_active ? (
                        <button
                          className="h-11 rounded-xl bg-[#D6336C] text-white"
                          onClick={handleBuyNow}
                        >
                          Beli Sekarang
                        </button>
                      ) : (
                        <button className="h-11 rounded-xl bg-gray-200 text-gray-500 cursor-not-allowed">
                          Tidak Tersedia
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

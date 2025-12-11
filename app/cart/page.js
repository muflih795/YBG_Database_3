"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
const supabase = supabaseBrowser;


function formatIDR(v) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v || 0);
}

function tableBySource(source) {
  if (source === "ybg_exclusive" || source === "exclusive") return "ybg_exclusive";
  return "products";
}

export default function CartPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const waNumber = process.env.NEXT_PUBLIC_SA_WA_NUMBER ;

  const subtotal = useMemo(
    () =>
      rows.reduce((acc, r) => {
        const price = typeof r?.product?.price === "number" ? r.product.price : 0;
        return acc + price * (r?.qty || 0);
      }, 0),
    [rows]
  );

  const waText = useMemo(() => {
    const lines = rows.map((r) => {
      const p = r.product || {};
      const title = p.nama || p.title || p.name || "Produk";
      const price = typeof p.price === "number" ? p.price : 0;
      return `• ${title} x${r.qty} (${formatIDR(price)})`;
    });
    return encodeURIComponent(
      `Halo kak, saya mau checkout:\n\n${lines.join("\n")}\n\nSubtotal: ${formatIDR(subtotal)}`
    );
  }, [rows, subtotal]);

  const waLink = `https://wa.me/${waNumber}?text=${waText}`;

  async function loadCart() {
    setLoading(true);
    setError("");
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userData?.user?.id;
      if (!uid) {
        setRows([]);
        setError("Silakan login untuk melihat keranjang.");
        return;
      }

      const { data: items, error: cartErr } = await supabase
        .from("cart_items")
        .select("id, product_id, source, qty")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (cartErr) throw cartErr;
      if (!items?.length) {
        setRows([]);
        return;
      }

      const bySource = items.reduce((acc, it) => {
        const s = it.source || "products";
        (acc[s] ||= []).push(it.product_id);
        return acc;
      }, {});

      const productsMap = new Map();

      if (bySource["ybg_exclusive"]?.length) {
        const ids = [...new Set(bySource["ybg_exclusive"])];
        const { data, error } = await supabase
          .from("ybg_exclusive")
          .select("id,nama,price,image_url,status,is_active,brand_slug,kategori,deskripsi")
          .in("id", ids);
        if (error) throw error;
        for (const p of data || []) productsMap.set(`ybg_exclusive:${p.id}`, p);
      }

      if (bySource["products"]?.length) {
        const ids = [...new Set(bySource["products"])];
        const { data, error } = await supabase
          .from("products")
          .select("id,nama,price,image_url,status,is_active,brand_slug,kategori,deskripsi")
          .in("id", ids);
        if (error) throw error;
        for (const p of data || []) productsMap.set(`products:${p.id}`, p);
      }

      const merged = items.map((it) => {
        const key = `${it.source || "products"}:${it.product_id}`;
        return {
          cart_id: it.id,
          product_id: it.product_id,
          source: it.source || "products",
          qty: it.qty || 1,
          product: productsMap.get(key) || null,
        };
      });

      setRows(merged);
    } catch (e) {
      setError(e?.message || "Gagal memuat keranjang.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCart();
  }, []);

  async function setQty(cartId, nextQty) {
    try {
      const row = rows.find((r) => r.cart_id === cartId);
      if (!row) return;

      if (nextQty <= 0) return remove(cartId);

      // optimistik
      setRows((prev) => prev.map((r) => (r.cart_id === cartId ? { ...r, qty: nextQty } : r)));
      const { error } = await supabase.from("cart_items").update({ qty: nextQty }).eq("id", cartId);
      if (error) throw error;
    } catch (e) {
      setError(e?.message || "Gagal memperbarui jumlah.");
      loadCart();
    }
  }

  async function remove(cartId) {
    try {
      setRows((prev) => prev.filter((r) => r.cart_id !== cartId));
      const { error } = await supabase.from("cart_items").delete().eq("id", cartId);
      if (error) throw error;
    } catch (e) {
      setError(e?.message || "Gagal menghapus item.");
      loadCart();
    }
  }

  async function clear() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) return;
      setRows([]);
      const { error } = await supabase.from("cart_items").delete().eq("user_id", uid);
      if (error) throw error;
    } catch (e) {
      setError(e?.message || "Gagal mengosongkan keranjang.");
      loadCart();
    }
  }

  function safeJson(s) {
    try {
      const j = JSON.parse(s);
      return Array.isArray(j) ? j : [];
    } catch {
      return [];
    }
  }

  // support image_urls (exclusive) & images_urls (products)
  function getPrimaryImage(p) {
    if (!p) return "/placeholder.png";
    const list =
      Array.isArray(p.image_urls)
        ? p.image_urls
        : (typeof p.image_urls === "string" && p.image_urls.trim() ? safeJson(p.image_urls) : null) ||
          (Array.isArray(p.images_urls)
            ? p.images_urls
            : (typeof p.images_urls === "string" && p.images_urls.trim() ? safeJson(p.images_urls) : null)) ||
          [];
    return p.image_url || list?.[0] || "/placeholder.png";
  }

  return (
    <div className="min-h-[100dvh] bg-neutral-100 flex justify-center">
      <main className="w-full min-h-[100dvh] bg-white md:max-w-[430px] md:shadow md:border flex flex-col">
        <div className="sticky top-0 z-10 bg-white px-4 py-3 shadow flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Kembali">
            <Image src="/back.svg" alt="Kembali" width={14} height={14} className="w-9 h-7 pr-3" />
          </button>
          <h1 className="text-[#D6336C] font-semibold">Cart</h1>
          <button onClick={clear} className="ml-auto text-sm text-rose-600">
            Kosongkan
          </button>
        </div>

        {/* State */}
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border rounded-2xl p-3 flex gap-3">
                <div className="w-[88px] h-[88px] bg-gray-100 animate-pulse rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-100 animate-pulse w-2/3 rounded" />
                  <div className="mt-2 h-4 bg-gray-100 animate-pulse w-1/3 rounded" />
                  <div className="mt-3 h-7 bg-gray-100 animate-pulse w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-sm text-gray-600">
            <p className="text-rose-600">{error}</p>
            <div className="mt-3">
              <Link href="/login" className="text-[#D6336C] underline">
                Login
              </Link>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-600">
            Cart masih kosong. Tambahkan dari halaman produk.
          </div>
        ) : (
          <ul className="p-4 space-y-3">
            {rows.map((it) => {
              const p = it.product || {};
              const title = p.nama || p.title || p.name || "Produk";
              const image = getPrimaryImage(p);
              const price = typeof p.price === "number" ? p.price : 0;

              return (
                <li key={it.cart_id} className="bg-white border rounded-2xl p-3 flex gap-3">
                  <div className="relative w-[88px] h-[88px] rounded-lg overflow-hidden shrink-0">
                    <Image src={image} alt={title} fill className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-black line-clamp-2">{title}</p>
                    <p className="text-xs text-[#D6336C] font-semibold mt-1">{formatIDR(price)}</p>

                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => setQty(it.cart_id, (it.qty || 1) - 1)}
                        className="w-7 h-7 grid place-items-center rounded-lg border border-[#D6336C] text-[#D6336C]"
                      >
                        –
                      </button>
                      <span className="text-sm w-6 text-black text-center">{it.qty || 1}</span>
                      <button
                        onClick={() => setQty(it.cart_id, (it.qty || 1) + 1)}
                        className="w-7 h-7 grid place-items-center rounded-lg border border-[#D6336C] text-[#D6336C]"
                      >
                        +
                      </button>

                      <button onClick={() => remove(it.cart_id)} className="ml-auto text-xs text-rose-600">
                        Hapus
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-auto sticky bottom-0 bg-white border-t px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">Subtotal</span>
            <span className="text-base font-semibold text-[#D6336C]">{formatIDR(subtotal)}</span>
          </div>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`block w-full h-11 rounded-xl text-white grid place-items-center ${
              rows.length ? "bg-[#D6336C]" : "bg-gray-300 pointer-events-none"
            }`}
          >
            Checkout via WhatsApp
          </a>
          <div className="h-2" />
        </div>
      </main>
    </div>
  );
}

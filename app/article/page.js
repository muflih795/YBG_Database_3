"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BottomNavigation from "../components/bottomnav";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
const supabase = supabaseBrowser;
export const dynamic = "force-dynamic"; 

function Card({ item }) {
  return (
    <Link
      href={`/article/${item.section}/${item.id}`}
      className="block rounded-xl overflow-hidden border shadow-sm"
    >
      <div className="relative w-full h-[140px] bg-gray-100">
        <img
          src={item.image_url || "/placeholder.png"}
          alt={item.title || "Article"}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3">
        <p className="text-[13px] font-semibold text-black line-clamp-2">
          {item.title || "-"}
        </p>
        {item.published_at && (
          <p className="mt-1 text-[11px] text-gray-500">
            {new Date(item.published_at).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function ArticlePage() {
  const [promo, setPromo] = useState(null);     
  const [goesto, setGoesto] = useState(null);
  const [errPromo, setErrPromo] = useState("");
  const [errGoesto, setErrGoesto] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        // fetch paralel biar cepat
        const [pRes, gRes] = await Promise.all([
          supabase
            .from("promo_event")
            .select(
              "id, judul, image_url, deskripsi, published_at, status, is_active",
              { head: false }
            )
            .eq("status", "published")
            .eq("is_active", true)
            .order("published_at", { ascending: false, nullsFirst: false }),

          supabase
            .from("ybg_article")
            .select(
              "id, nama, image_url, deskripsi, published_at, status, is_active",
              { head: false }
            )
            .eq("status", "published")
            .eq("is_active", true)
            .order("published_at", { ascending: false, nullsFirst: false }),
        ]);

        // PROMO
        if (!alive) return;
        if (pRes.error) {
          console.error("promo_event error:", pRes.error);
          setErrPromo(pRes.error.message || "Gagal memuat Promo & Event");
          setPromo([]);
        } else {
          const list =
            (pRes.data || []).map((r) => ({
              section: "promo",
              id: r.id,
              title: r.judul,
              image_url: r.image_url,
              deskripsi: r.deskripsi,
              published_at: r.published_at,
            })) || [];
          setPromo(list);
        }

        // ARTICLE
        if (!alive) return;
        if (gRes.error) {
          console.error("ybg_goesto error:", gRes.error);
          setErrGoesto(gRes.error.message || "Gagal memuat YBG Goes To Feed");
          setGoesto([]);
        } else {
          const list =
            (gRes.data || []).map((r) => ({
              section: "goesto",
              id: r.id,
              title: r.nama,
              image_url: r.image_url,
              deskripsi: r.deskripsi,
              published_at: r.published_at,
            })) || [];
          setGoesto(list);
        }
      } catch (e) {
        console.error("Article load fatal:", e);
        if (alive) {
          setPromo([]);
          setGoesto([]);
          setErrPromo("Terjadi kesalahan memuat data.");
          setErrGoesto("Terjadi kesalahan memuat data.");
        }
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-neutral-100 flex justify-center">
      <main className="w-full min-h-[100dvh] bg-white flex flex-col md:max-w-[430px] md:shadow md:border">
        <div className="sticky top-0 z-10 bg-white text-[#D6336C] px-4 py-3 font-semibold shadow">
          Article
        </div>

        <div className="p-3 space-y-6">
          {/* Promo & Event */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-[#D6336C]">
                Promo & Event
              </h2>
            </div>

            {errPromo && (
              <p className="text-xs text-rose-600 mb-2">
                {errPromo} {`Jika selalu kosong padahal ada data, cek RLS
                policy: izinkan SELECT untuk status='published' dan is_active=true.`}
              </p>
            )}

            {promo === null ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[190px] bg-gray-100 animate-pulse rounded-xl"
                  />
                ))}
              </div>
            ) : promo.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada data.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {promo.map((it) => (
                  <Card key={`p-${it.id}`} item={it} />
                ))}
              </div>
            )}
          </section>

          {/* YBG Goes To Feed */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-[#D6336C]">
                YBG Goes To Feed
              </h2>
            </div>

            {errGoesto && (
              <p className="text-xs text-rose-600 mb-2">
                {errGoesto} — Jika selalu kosong padahal ada data, cek RLS
                policy tabel ybg_goesto.
              </p>
            )}

            {goesto === null ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[190px] bg-gray-100 animate-pulse rounded-xl"
                  />
                ))}
              </div>
            ) : goesto.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada data.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {goesto.map((it) => (
                  <Card key={`g-${it.id}`} item={it} />
                ))}
              </div>
            )}
          </section>
        </div>

        <BottomNavigation />
      </main>
    </div>
  );
}

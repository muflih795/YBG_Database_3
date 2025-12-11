"use client";

import { useMemo, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
const supabase = supabaseBrowser;


const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();

  // section: "promo" | "article"
  const section = useMemo(() => {
    const s = Array.isArray(params?.section) ? params.section[0] : params?.section;
    return (s || "").toLowerCase();
  }, [params]);

  // id from URL
  const rawId = useMemo(() => {
    const r = Array.isArray(params?.id) ? params.id[0] : params?.id;
    return decodeURIComponent(String(r ?? "")).trim();
  }, [params]);

  // table by section 
  const table = useMemo(() => {
    if (section === "promo") return "promo_event";
    if (section === "article") return "ybg_article";
    return ""; 
  }, [section]);

  // title column by table
  const titleCol = useMemo(() => {
    if (table === "promo_event") return "judul";
    if (table === "ybg_article") return "nama";
    return "";
  }, [table]);

  const [item, setItem] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {

    if (!table || !titleCol || !rawId) return;

    let alive = true;

    (async () => {
      try {
        const id = Number(rawId);
        if (!Number.isFinite(id)) {
          setErr("ID artikel tidak valid.");
          setItem(null);
          return;
        }

        const baseCols = "id,image_url,deskripsi,published_at,status,is_active";
        const { data, error } = await supabase
          .from(table)
          .select(`${baseCols}, ${titleCol}`)
          .eq("id", id)
          .eq("status", "published")
          .eq("is_active", true)
          .maybeSingle();

        if (error) throw error;
        if (!alive) return;

        if (!data) {
          setErr("Artikel tidak ditemukan.");
          setItem(null);
          return;
        }

        setItem({ ...data, title: data[titleCol] ?? "Tanpa Judul" });
        setErr("");
      } catch (e) {
        if (!alive) return;
        setItem(null);
        setErr("Gagal memuat artikel.");

      }
    })();

    return () => {
      alive = false;
    };
  }, [table, titleCol, rawId]);

  return (
    <div className="min-h-[100dvh] bg-neutral-100 flex justify-center">
      <main className="w-full max-w-[430px] min-h-[100dvh] bg-white md:shadow md:border">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white px-4 py-3 shadow flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Kembali"
            className="p-1 rounded hover:bg-pink-50 text-[#D6336C] transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M15.5 5.5L9 12l6.5 6.5-1.4 1.4L6.2 12l7.9-7.9 1.4 1.4Z" />
            </svg>
          </button>

          <h1 className="text-[#D6336C] font-semibold">
            {section === "promo" ? "Promo & Event" : "YBG Article"}
          </h1>
        </div>

        {/* States */}
        {err ? (
          <div className="p-4">
            <p className="text-sm text-rose-600">{err}</p>
            <Link href="/article" className="text-[#D6336C] text-sm mt-2 inline-block">
              Kembali ke daftar
            </Link>
          </div>
        ) : !item ? (
          <div className="p-4">
            <div className="relative w-full h-[240px] bg-gray-100 animate-pulse rounded-xl" />
            <div className="mt-3 h-5 w-3/5 bg-gray-100 animate-pulse rounded" />
            <div className="mt-2 h-4 w-2/5 bg-gray-100 animate-pulse rounded" />
          </div>
        ) : (
          <div className="p-4">
            <div className="relative w-full h-[240px] rounded-xl overflow-hidden bg-gray-50">
              <img
                src={item.image_url || "/placeholder.png"}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>

            <h2 className="mt-3 text-[18px] font-bold leading-snug text-black">{item.title}</h2>
            {item.published_at && (
              <p className="mt-1 text-[12px] text-gray-500">Dipublikasikan: {fmtDate(item.published_at)}</p>
            )}

            <div className="mt-3 text-[14px] leading-relaxed text-gray-800 whitespace-pre-line">
              {item.deskripsi || "Belum ada konten."}
            </div>

            <div className="mt-5 flex items-center gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  item.title + " - " + (globalThis?.location?.href || "")
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 h-10 grid place-items-center rounded-lg bg-[#25D366] text-white text-sm"
              >
                Bagikan
              </a>
              <Link
                href="/article"
                className="px-4 h-10 grid place-items-center rounded-lg ring-1 ring-[#D6336C] text-[#D6336C] text-sm"
              >
                Lihat Artikel Lainnya
              </Link>
            </div>

            <div className="h-10" />
          </div>
        )}
      </main>
    </div>
  );
}

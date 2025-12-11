"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
const supabase = supabaseBrowser;


export default function BannerCarousel({ heightClass = "h-[300px] md:h-[300px] lg:h-[400px]" }) {
  const [slides, setSlides] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // tombol navigasi
  const prevRef = useRef(null);
  const nextRef = useRef(null);

  const idsKey = slides.map((s) => s.id).join(",");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .schema("public")
        .from("info")
        .select("id,image_url,deskripsi,created_at")
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error("load banners error:", error);
        setSlides([]);
      } else {
        const list = (data || [])
          .filter((r) => r?.image_url)
          .map((r) => ({
            id: r.id,
            src: r.image_url,
            alt: r.deskripsi || `Banner ${r.id}`,
          }));
        setSlides(list);
      }
      setLoaded(true);
    };

    load();

    // Realtime subscribe
    const ch = supabase
      .channel("public:info")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "info" }, (p) => {
        const r = p.new;
        if (!r?.image_url) return;
        setSlides((prev) => [
          { id: r.id, src: r.image_url, alt: r.deskripsi || `Banner ${r.id}` },
          ...prev.filter((x) => x.id !== r.id),
        ]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "info" }, (p) => {
        const r = p.new;
        setSlides((prev) =>
          prev.map((x) =>
            x.id === r.id ? { id: r.id, src: r.image_url, alt: r.deskripsi || `Banner ${r.id}` } : x
          )
        );
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "info" }, (p) => {
        const r = p.old;
        setSlides((prev) => prev.filter((x) => x.id !== r.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      mounted = false;
    };
  }, []);

  // skeleton saat loading
  if (!loaded) {
    return (
      <div className={`w-full ${heightClass}`}>
        <div className="w-full h-full animate-pulse bg-pink-100/40 rounded-xl" />
      </div>
    );
  }

  // kosong
  if (!slides.length) {
    return (
      <div
        className={`w-full ${heightClass} grid place-items-center rounded-xl bg-neutral-100 text-neutral-400`}
      >
        Tidak ada banner
      </div>
    );
  }


  if (slides.length === 1) {
    const b = slides[0];
    return (
      <div className={`relative w-full ${heightClass} overflow-hidden`}>
        <Image
          src={b.src}
          alt={b.alt || "Banner"}
          fill
          priority
          sizes="100vw"
          className="object-contain"
        />
      </div>
    );
  }


  return (
    <div className="relative w-full">
      {slides.length > 1 && (
        <>
          <button
            ref={prevRef}
            aria-label="Sebelumnya"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 grid place-items-center w-9 h-9 rounded-full text-[#D6336C] bg-white/90 hover:bg-white shadow"
          >
            ‹
          </button>
          <button
            ref={nextRef}
            aria-label="Berikutnya"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 grid place-items-center w-9 h-9 rounded-full text-[#D6336C] bg-white/90 hover:bg-white shadow"
          >
            ›
          </button>
        </>
      )}

      <Swiper
        key={idsKey} 
        modules={[Autoplay, Pagination, Navigation]}
        slidesPerView={1}
        loop
        pagination={{ clickable: true }}
        autoplay={{ delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true }}
        className="w-full"

        onInit={(swiper) => {
          swiper.params.navigation.prevEl = prevRef.current;
          swiper.params.navigation.nextEl = nextRef.current;
          swiper.navigation.init();
          swiper.navigation.update();
        }}
      >
        {slides.map((s, i) => (
          <SwiperSlide key={s.id ?? i}>
            <div className={`relative w-full ${heightClass} overflow-hidden`}>
              <Image
                src={s.src}
                alt={s.alt || `Banner ${i + 1}`}
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-contain"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

export default function ImageCarousel({ urls = [], alt = "Foto produk", className = "", height = 260 }) {
  const images = useMemo(() => Array.from(new Set((urls || []).filter(Boolean))), [urls]);
  const [i, setI] = useState(0);

  useEffect(() => {
    setI(0);
  }, [images.length]);

  useEffect(() => {
    if (i >= images.length) setI(0);
  }, [i, images.length]);

  const [startX, setStartX] = useState(null);
  const onStart = (e) => setStartX((e.touches?.[0]?.clientX) ?? e.clientX);
  const onEnd = (e) => {
    if (startX == null || images.length <= 1) return;
    const endX = (e.changedTouches?.[0]?.clientX) ?? e.clientX;
    const dx = endX - startX;
    if (dx > 40) setI((p) => (p - 1 + images.length) % images.length);
    if (dx < -40) setI((p) => (p + 1) % images.length);
    setStartX(null);
  };

  const current = images.length ? images[i] : "/placeholder.png";

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden border select-none ${className}`}
      style={{ height: typeof height === "number" ? `${height}px` : height }}
      onMouseDown={onStart}
      onMouseUp={onEnd}
      onTouchStart={onStart}
      onTouchEnd={onEnd}
    >
      <Image
        key={`${current}-${images.length}`}  
        src={current}
        alt={alt}
        fill
        sizes="(max-width: 430px) 100vw, 430px"
        className="object-cover"
        priority
      />

      {images.length > 1 && (
        <>
          <button
            aria-label="Sebelumnya"
            onClick={() => setI((p) => (p - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-full bg-white/80 hover:bg-white shadow"
          >
            ‹
          </button>
          <button
            aria-label="Berikutnya"
            onClick={() => setI((p) => (p + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-full bg-white/80 hover:bg-white shadow"
          >
            ›
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((url, idx) => (
              <span
                key={`${url}-${idx}`}
                className={`h-1 rounded-full transition-all ${idx === i ? "w-4 bg-rose-500" : "w-2 bg-rose-300"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";

export const ARTICLES = [
  { id: "a1", title: "Promo Event : Birthday Treat", subtitle: "Menyambut ulang tahun spesial", image: "/banner/banner2.jpg", cta: "Detail", category: "event" },
  { id: "a2", title: "Noeneo Monogram LV Function", subtitle: "Effortless style meets everyday function", image: "/banner/banner1.jpg", cta: "Detail", category: "event" },
  { id: "a3", title: "Beau Top Handle", subtitle: "Classic lines, modern vibes", image: "/banner/banner_3.png", cta: "Detail", category: "event" },

  { id: "f1", title: "Loulou Bag YSL", subtitle: "Soft, chic, and luxurious", image: "/product/product4.jpg", cta: "Detail", category: "feed1" },
  { id: "f2", title: "Noeneo Monogram LV", subtitle: "Luxury redefined for daily use", image: "/product/product3.jpg", cta: "Detail", category: "feed1" },
  { id: "f3", title: "Beau Top Handle", subtitle: "Elegan untuk setiap kesempatan", image: "/product/product2.jpg", cta: "Detail", category: "feed1" },

  { id: "s1", title: "Behind the Sisters X Erin", subtitle: "Kolaborasi eksklusif dengan Erin", image: "/feed/feed1.jpg", cta: "Detail", category: "feed2" },
  { id: "s2", title: "Strolling Around : Chatuchak Market", subtitle: "Jelajah pasar Thailand yang ikonik", image: "/feed/feed2.jpg", cta: "Play", category: "feed2" },
  { id: "s3", title: "Behind the Scene : Wayan Production", subtitle: "Cerita dibalik layar produksi", image: "/feed/feed3.jpg", cta: "Detail", category: "feed2" },
];


export function ArticleCard({ item }) {
  return (
    <li className="snap-start shrink-0 w-[180px]">
      <div className="block bg-white rounded-2xl shadow overflow-hidden">
        {/* Gambar */}
        <div className="relative w-full h-[120px]">
          <Image
            src={item.image}
            alt={item.title}
            fill
            className="object-cover"
          />
        </div>

        {/* Konten */}
        <div className="p-2">
          <p className="text-sm font-semibold line-clamp-2 text-black">
            {item.title}
          </p>
          {item.subtitle && (
            <p className="text-xs text-gray-500 line-clamp-2 mt-1">
              {item.subtitle}
            </p>
          )}
          <Link
            href={`/article/${item.id}`}
            className="mt-2 inline-block bg-[#D6336C] text-white text-xs px-3 py-1 rounded-lg"
          >
            {item.cta}
          </Link>
        </div>
      </div>
    </li>
  );
}


export function ArticleSection({ title, items }) {
  return (
    <section className="mt-5">
      <h2 className="px-4 text-[16px] font-bold text-black">{title}</h2>
      <ul className="mt-3 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
        {items.map((item) => (
          <ArticleCard key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

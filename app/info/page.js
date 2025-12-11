"use client";
import InfoCarousel from "../components/InfoCarousel";
import { useRouter } from "next/navigation";

export default function InfoPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-neutral-100 flex justify-center">
      <main
        className="
          w-full min-h-[100dvh]
          bg-[#E6B8C8]    /* warna carousel */
          flex flex-col
          md:max-w-[430px] md:shadow md:border
        "
      >
        <InfoCarousel/>
      </main>
    </div>
  );
}

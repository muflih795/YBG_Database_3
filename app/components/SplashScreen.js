"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SplashScreen() {
        const [show, setShow] = useState(true);
        const router = useRouter();

        useEffect(() => {
            const seen = localStorage.getItem("ybg_seen_splash");
            if (seen === "true") {
            router.replace("/info");
            return;
            }

            const t = setTimeout(() => {
            localStorage.setItem("ybg_seen_splash", "true");
            setShow(false);
            router.replace("/info");
            }, 1500);

            return () => clearTimeout(t);
        }, [router]);

        if (!show) return null;

    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 9999,
                display: "grid", placeItems: "center",
                background: "#E6B8C8",
                color: "#fff"
            }}
        >
            <img
                src="/logo_ybg.png"
                alt="YBG Logo"
                width={120}
                height={120}
            />
        </div>
    );
}
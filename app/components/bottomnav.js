"use client";

import { Home, ShoppingBag, Users, FileText, User } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/product", label: "Product", icon: ShoppingBag },
  { href: "/membership", label: "Membership", icon: Users },
  { href: "/article", label: "Article", icon: FileText },
  { href: "/profile", label: "Profile", icon: User },
];

export default function BottomNavigation() {
  const pathname = usePathname() || "/";

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="mx-auto md:max-w-[430px] w-full">

        <div className="bg-white border-t border-gray-200 shadow-sm"
             style={{ paddingTop: "0.5rem", paddingBottom: "env(safe-area-inset-bottom, 12px)" }}>
          <nav className="flex justify-around items-center h-[64px] px-2">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(item.href + "/") || (item.href === "/home" && pathname === "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center text-xs transition-colors select-none ${
                    active ? "text-[#D6336C]" : "text-gray-600 hover:text-[#D6336C]"
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-1 ${active ? "text-[#D6336C]" : ""}`} />
                  <span className="leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

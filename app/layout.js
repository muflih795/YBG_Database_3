import "./globals.css";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export const metadata = {
  title: "YBG",
  description: "Website YBG menggunakan font Montserrat",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/logo_ybg.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/logo_ybg.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={montserrat.variable}>
      <body className="font-sans bg-neutral-100 text-[#171717] min-h-[100dvh]">
        {children}
      </body>
    </html>
  );
}

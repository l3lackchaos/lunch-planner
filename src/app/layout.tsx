import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import LiffProvider from "@/components/providers/LiffProvider";
import "./globals.css";

const thai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lunch Planner",
  description: "สั่งข้าวกลางวัน เลือกไข่ และแจ้งชำระเงิน ผ่าน LINE",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // กันการ zoom เด้งใน LINE webview
  themeColor: "#fbf7f0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={thai.variable}>
      <body className="min-h-dvh antialiased">
        <LiffProvider>{children}</LiffProvider>
      </body>
    </html>
  );
}

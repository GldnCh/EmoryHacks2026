import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

// Apple devices use SF Pro (system font); Geist is the fallback elsewhere.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "iCare",
  description: "AI telehealth platform built at Emory Hacks 2026. Not medical advice.",
  appleWebApp: { capable: true, title: "iCare", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f2f2f7",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-dvh flex-col pb-[calc(80px+env(safe-area-inset-bottom))] sm:pb-0`}
      >
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10 pt-2 sm:px-6">{children}</main>
        <footer className="px-6 pb-8 pt-2 text-center text-footnote text-muted">
          Not medical advice. Demo uses a fictional family with fabricated data.
        </footer>
      </body>
    </html>
  );
}

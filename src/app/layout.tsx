import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ServiceWorker from "@/components/ServiceWorker";
import SiteHeader from "@/components/SiteHeader";
import WarmArt from "@/components/WarmArt";
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
  applicationName: "iCare",
  appleWebApp: { capable: true, title: "iCare", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbf5ef",
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
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-dvh flex-col pb-[calc(72px+env(safe-area-inset-bottom))] sm:pb-0`}
      >
        <ServiceWorker />
        {/* the warm artwork behind every page; content floats on glass above it */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 print:hidden">
          <WarmArt />
        </div>
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-6 pt-1 sm:px-6">{children}</main>
        <footer className="px-6 pb-6 pt-1 text-center text-footnote text-muted">
          Not medical advice. Demo uses a fictional family with fabricated data.
        </footer>
      </body>
    </html>
  );
}

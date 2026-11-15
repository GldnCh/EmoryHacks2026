// Web app manifest (TD): lets iCare be installed to the iPhone/Android home screen and open full screen.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "iCare",
    short_name: "iCare",
    description: "Family telehealth: wellness check-ins, medicine search and family health trends. Not medical advice.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2f2f7",
    theme_color: "#f2f2f7",
    categories: ["health", "medical", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Family", url: "/dashboard", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Check-in", url: "/checkin", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Medicines", url: "/medicines", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}

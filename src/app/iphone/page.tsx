// Shareable iPhone view (Cam): the live app inside an iPhone frame for laptop viewers. See DevicePreview.
import type { Metadata } from "next";
import DevicePreview from "@/components/DevicePreview";

export const metadata: Metadata = { title: "iCare · iPhone view" };

export default function IphonePreviewPage() {
  return <DevicePreview kind="iphone" />;
}

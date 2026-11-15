// Shareable Apple Watch view (Cam): the /watch view inside a watch frame for laptop viewers. See DevicePreview.
import type { Metadata } from "next";
import DevicePreview from "@/components/DevicePreview";

export const metadata: Metadata = { title: "iCare · Apple Watch view" };

export default function WatchPreviewPage() {
  return <DevicePreview kind="watch" />;
}

// iCare on Apple Watch (Cam): open a link to /watch on the Watch (from Messages or Mail). See WatchApp.
import type { Metadata } from "next";
import WatchApp from "@/components/WatchApp";

export const metadata: Metadata = {
  title: "iCare · Watch",
  // Tells the Watch's web view to use the real screen width instead of shrinking a phone-size page.
  other: { "disabled-adaptations": "watch" },
};

export default function WatchPage() {
  return <WatchApp />;
}

"use client";
// Home (TD; redesigned by Cam): the family platform (FamilyStage), full screen on phones and a two-column stage on
// larger screens. ("Meet the Rivera family" row and the desktop pitch card removed, Cam Sat night.)
// ("What iCare does" tiles removed for now, Cam Sat night; restore them from git history when they get a new spot.)
import Disclaimer from "@/components/Disclaimer";
import FamilyStage from "@/components/FamilyStage";

export default function Home() {
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Home: your family on the turning platform (phones full screen; larger screens a two-column stage) */}
      <FamilyStage />

      <div className="hidden sm:block">
        <Disclaimer />
      </div>
    </div>
  );
}

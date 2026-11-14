"use client";
// Top-right of the header: whose iPhone this is (tap for connections and sharing), with a badge when someone
// has sent a connection request. Before the one-time setup it shows "Set up".
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useMe } from "@/components/useMe";

export default function AccountButton() {
  const { me } = useMe();
  if (!me) return <span className="h-9 w-9" aria-hidden />;
  if (!me.setUp || !me.account) {
    return (
      <Link href="/setup" className="btn btn-secondary min-h-9 px-3 text-[15px]">
        Set up
      </Link>
    );
  }
  const first = me.account.displayName.split(" ")[0];
  const n = me.incomingRequests;
  return (
    <Link
      href="/account"
      className="pressable relative flex min-h-11 items-center gap-2 rounded-full pl-1 pr-1 sm:pr-3"
      aria-label={`${me.account.displayName}'s iCare${n ? `, ${n} connection request${n > 1 ? "s" : ""}` : ""}`}
    >
      <Avatar id={me.account.id} name={me.account.displayName} size={32} />
      <span className="hidden text-[15px] font-medium sm:inline">{first}</span>
      {n > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#d92d20] px-1 text-[12px] font-semibold text-white">
          {n}
        </span>
      )}
    </Link>
  );
}

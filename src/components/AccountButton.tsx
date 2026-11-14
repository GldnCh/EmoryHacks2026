"use client";
// Top-right of the header: who is using iCare on this device (tap for account, switching and family sharing),
// or "Sign in" if nobody is.
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useMe } from "@/components/useMe";

export default function AccountButton() {
  const { me } = useMe();
  if (!me) return <span className="h-9 w-9" aria-hidden />;
  if (!me.signedIn || !me.account) {
    return (
      <Link href="/signin" className="btn btn-secondary min-h-9 px-3 text-[15px]">
        Sign in
      </Link>
    );
  }
  const first = me.account.displayName.split(" ")[0];
  return (
    <Link href="/account" className="pressable flex min-h-11 items-center gap-2 rounded-full pl-1 pr-1 sm:pr-3" aria-label={`Account: ${me.account.displayName}`}>
      <Avatar id={me.account.id} name={me.account.displayName} size={32} />
      <span className="hidden text-[15px] font-medium sm:inline">{first}</span>
    </Link>
  );
}

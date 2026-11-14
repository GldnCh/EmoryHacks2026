// Shown where a page needs to know whose iPhone this is (before the one-time /setup), or when you aren't
// connected to someone. Plain links, so it works the same on every page.
import Link from "next/link";
import { InfoIcon, PeopleIcon } from "@/components/Icons";

export function SetupPrompt({ what = "your family's health" }: { what?: string }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-brand">
        <PeopleIcon size={32} />
      </span>
      <h2 className="mt-5 text-title2">Whose iPhone is this?</h2>
      <p className="mt-2 max-w-sm text-subhead text-secondary">
        iCare shows {what} to you and the people you&apos;re connected to. Tell us once whose iPhone this is. There&apos;s no sign-in.
      </p>
      <Link href="/setup" className="btn btn-primary mt-6">
        Set up this iPhone
      </Link>
    </div>
  );
}

export function NotConnected({ name }: { name: string }) {
  const first = name.split(" ")[0];
  return (
    <div role="alert" className="card flex flex-col items-center px-6 py-10 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-fill text-muted">
        <InfoIcon size={32} />
      </span>
      <h2 className="mt-5 text-title2">You&apos;re not connected with {first}</h2>
      <p className="mt-2 max-w-sm text-subhead text-secondary">
        {first}&apos;s health is private. Send {first} a connection request; once they accept, you&apos;ll see what they choose to share.
      </p>
      <Link href="/account" className="btn btn-primary mt-6">
        Go to My iCare
      </Link>
    </div>
  );
}

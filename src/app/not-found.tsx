// Friendly iOS-style empty state for a link that doesn't match any page.
import Link from "next/link";
import { InfoIcon } from "@/components/Icons";

export default function NotFound() {
  return (
    <div className="card mx-auto mt-4 flex max-w-md flex-col items-center px-6 py-10 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-fill text-muted">
        <InfoIcon size={32} />
      </span>
      <h1 className="mt-5 text-title2">We couldn&apos;t find that page</h1>
      <p className="mt-2 max-w-sm text-subhead text-secondary">
        The link may be mistyped or out of date. Everything in iCare is one tap away from the family dashboard.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/dashboard" className="btn btn-primary">
          Go to dashboard
        </Link>
        <Link href="/" className="btn btn-secondary">
          Home
        </Link>
      </div>
    </div>
  );
}

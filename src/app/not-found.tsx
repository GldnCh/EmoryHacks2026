// Friendly iOS-style empty state for any page that doesn't exist yet
// (Check-in, Medicines and Specialists show this until those pull requests merge).
import Link from "next/link";
import { InfoIcon } from "@/components/Icons";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-fill text-muted">
        <InfoIcon size={32} />
      </span>
      <h1 className="mt-5 text-title2">This screen isn&apos;t here yet</h1>
      <p className="mt-2 max-w-sm text-subhead text-secondary">
        It may still be in progress. Check-in, Medicines and Specialists are being built by the team and will appear here soon.
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

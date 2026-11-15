"use client";
// Shown by the service worker when the installed app has no connection (TD).
// The service worker serves this in place of the page you asked for, so "Try again" reloads that page.

export default function OfflinePage() {
  return (
    <div className="card mx-auto mt-4 flex max-w-md flex-col items-center px-6 py-10 text-center">
      <span aria-hidden className="grid h-16 w-16 place-items-center rounded-full bg-fill text-muted">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
          <circle cx="12" cy="19.5" r="1" fill="currentColor" />
          <path d="M3 3l18 18" />
        </svg>
      </span>
      <h1 className="mt-5 text-title2">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-subhead text-secondary">
        iCare needs a connection to show health data. Health data isn&apos;t saved on this device, so reconnect to see the latest.
      </p>
      <button type="button" onClick={() => window.location.reload()} className="btn btn-primary mt-6">
        Try again
      </button>
      <p className="mt-8 max-w-sm text-footnote text-muted">In an emergency, call 911.</p>
    </div>
  );
}

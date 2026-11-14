export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold">IDoc</h1>
      <p className="max-w-md text-lg opacity-80">
        AI-led wellness checkups, medicine search and health summaries. Built at Emory Hacks 2026.
      </p>
      <p className="text-sm opacity-60">Not medical advice. Demo uses fabricated data only.</p>
      <a href="/api/health" className="underline text-sm">Check API key setup</a>
    </main>
  );
}

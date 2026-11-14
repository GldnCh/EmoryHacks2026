"use client";
// /checkin: AI wellness check-in chat + monthly/yearly AI health summaries. Owner: Ish.
// Styling is intentionally plain Tailwind; TD owns the design system and will polish it.
// This page only talks to our own API routes; the Gemini key never reaches the browser.
import { useEffect, useRef, useState } from "react";

type Member = { id: string; name: string; relationship: string; age: number };
type Msg = { role: "user" | "model"; text: string; emergency?: boolean };
type CheckinSummary = { points: string[]; nextStep: string };
type SummaryResponse = {
  name?: string;
  range?: string;
  dataSource?: string;
  summary?: { headline: string; highlights: string[]; watchItems: string[]; encouragement: string } | null;
  raw?: string;
  error?: string;
  cached?: boolean;
  disclaimer?: string;
};

const DISCLAIMER =
  "iCare is not medical advice. It does not diagnose conditions or change medications. Talk to a doctor, nurse or pharmacist about your health. In an emergency, call 911.";

export default function CheckinPage() {
  const [family, setFamily] = useState<Member[]>([]);
  const [memberId, setMemberId] = useState("jordan");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<CheckinSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/sample/family")
      .then((r) => r.json())
      .then((d) => setFamily(d.family ?? []))
      .catch(() => setFamily([]));
  }, []);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const member = family.find((m) => m.id === memberId);
  const firstName = member?.name.split(" ")[0] ?? memberId;

  function reset(id = memberId) {
    setMemberId(id);
    setMessages([]);
    setStarted(false);
    setDone(false);
    setSummary(null);
    setError(null);
    setInput("");
  }

  async function send(history: Msg[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/checkin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId, messages: history.map(({ role, text }) => ({ role, text })) }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setMessages([...history, { role: "model", text: data.reply, emergency: data.emergency }]);
      if (data.done) {
        setDone(true);
        setSummary(data.summary ?? null);
      }
    } catch {
      setError("Couldn't reach iCare. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function start() {
    setStarted(true);
    void send([]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading || done) return;
    const history: Msg[] = [...messages, { role: "user", text }];
    setMessages(history);
    setInput("");
    void send(history);
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">Wellness check-in</h1>
        <p className="opacity-70">A quick, friendly AI check-in about sleep, energy, pain, mood and medications.</p>
      </header>

      <p role="note" className="rounded-lg border border-amber-400/60 bg-amber-50 p-3 text-sm text-amber-900">
        {DISCLAIMER}
      </p>

      {/* Member picker */}
      <section className="flex flex-wrap gap-2" aria-label="Choose a family member">
        {(family.length ? family : [{ id: "jordan", name: "Jordan Rivera", relationship: "self", age: 45 }]).map((m) => (
          <button
            key={m.id}
            onClick={() => reset(m.id)}
            className={`rounded-full border px-4 py-2 text-sm ${
              m.id === memberId ? "border-teal-600 bg-teal-600 text-white" : "border-gray-300 hover:border-teal-600"
            }`}
          >
            {m.name.split(" ")[0]} <span className="opacity-70">({m.relationship}, {m.age})</span>
          </button>
        ))}
      </section>

      {/* Chat */}
      <section className="flex flex-col gap-3 rounded-xl border border-gray-300/70 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Check-in with {firstName}</h2>
          {started && (
            <button onClick={() => reset()} className="text-sm underline opacity-70 hover:opacity-100">
              Start over
            </button>
          )}
        </div>

        {!started ? (
          <button
            onClick={start}
            className="self-start rounded-lg bg-teal-600 px-5 py-3 font-medium text-white hover:bg-teal-700"
          >
            Start check-in
          </button>
        ) : (
          <>
            <ul className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto" aria-live="polite">
              {messages.map((m, i) => (
                <li
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    m.emergency
                      ? "self-start border-2 border-red-600 bg-red-50 font-semibold text-red-900"
                      : m.role === "user"
                        ? "self-end bg-teal-600 text-white"
                        : "self-start bg-gray-100 text-gray-900"
                  }`}
                >
                  {m.emergency && <span className="mb-1 block text-sm uppercase tracking-wide">⚠ Get help now</span>}
                  {m.text}
                </li>
              ))}
              {loading && <li className="self-start rounded-2xl bg-gray-100 px-4 py-2 text-gray-500">iCare is typing…</li>}
              <div ref={endRef} />
            </ul>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {summary && (
              <div className="rounded-lg border border-teal-600/50 bg-teal-50 p-4 text-teal-950">
                <h3 className="font-semibold">Check-in summary</h3>
                <ul className="ml-5 mt-2 list-disc text-sm">
                  {summary.points.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
                {summary.nextStep && (
                  <p className="mt-3 text-sm">
                    <span className="font-semibold">Suggested next step: </span>
                    {summary.nextStep}
                  </p>
                )}
              </div>
            )}

            {!done ? (
              <form onSubmit={submit} className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={1000}
                  placeholder="Type your answer…"
                  aria-label="Your answer"
                  className="flex-1 rounded-lg border border-gray-300 bg-transparent px-3 py-2"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="rounded-lg bg-teal-600 px-4 py-2 font-medium text-white disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            ) : (
              <p className="text-sm opacity-70">This check-in is finished. Use “Start over” to begin a new one.</p>
            )}
          </>
        )}
      </section>

      <SummaryPanel key={memberId} memberId={memberId} firstName={firstName} />
    </main>
  );
}

function SummaryPanel({ memberId, firstName }: { memberId: string; firstName: string }) {
  const [period, setPeriod] = useState<"month" | "year" | null>(null);
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(p: "month" | "year") {
    setPeriod(p);
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(`/api/ai/summary/${memberId}?period=${p}`);
      setData(await res.json());
    } catch {
      setData({ error: "Couldn't reach iCare. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  const s = data?.summary;
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-gray-300/70 p-4">
      <h2 className="text-lg font-semibold">{firstName}&apos;s health summary</h2>
      <div className="flex flex-wrap gap-2">
        {(["month", "year"] as const).map((p) => (
          <button
            key={p}
            onClick={() => load(p)}
            disabled={loading}
            className={`rounded-lg border px-4 py-2 text-sm disabled:opacity-50 ${
              period === p ? "border-teal-600 bg-teal-600 text-white" : "border-gray-300 hover:border-teal-600"
            }`}
          >
            Get my {p === "month" ? "monthly" : "yearly"} summary
          </button>
        ))}
      </div>

      {loading && <p className="text-sm opacity-70">Writing {firstName}&apos;s summary…</p>}
      {data?.error && <p className="text-sm text-red-600">{data.error}</p>}

      {s && (
        <div className="flex flex-col gap-3">
          <p className="text-sm opacity-60">
            {data?.range} · data from {data?.dataSource}
            {data?.cached ? " · cached" : ""}
          </p>
          <p className="text-xl font-semibold">{s.headline}</p>
          <ul className="ml-5 list-disc">
            {s.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
          {s.watchItems.length > 0 && (
            <div className="rounded-lg border border-amber-400/60 bg-amber-50 p-3 text-amber-900">
              <p className="font-semibold">Worth discussing with your doctor</p>
              <ul className="ml-5 list-disc text-sm">
                {s.watchItems.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="italic">{s.encouragement}</p>
        </div>
      )}
      {data && !s && data.raw && <p className="whitespace-pre-wrap text-sm">{data.raw}</p>}
      {data?.disclaimer && <p className="text-xs opacity-60">{data.disclaimer}</p>}
    </section>
  );
}

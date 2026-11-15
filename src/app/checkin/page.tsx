"use client";
// /checkin: AI wellness check-in chat + monthly/yearly AI health summaries. Owner: Ish (logic, prompts, safety wording).
// Styling (TD): the app's shared components and color tokens. Only the markup changed; state and API calls are Ish's.
// This page only talks to our own API routes; the Gemini key never reaches the browser.
import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import CheckinHistory from "@/components/CheckinHistory";
import FaceTimeCall from "@/components/FaceTimeCall";
import { InfoIcon, VideoIcon, WarningIcon } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";
import SegmentedControl from "@/components/SegmentedControl";
import { ErrorNote, Skeleton } from "@/components/Status";
import { RELATIONSHIP } from "@/components/types";

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

const FALLBACK_FAMILY: Member[] = [{ id: "jordan", name: "Jordan Rivera", relationship: "self", age: 45 }];

// Soft red background for the emergency bubble (there's no --danger-soft token yet).
const DANGER_SOFT = "bg-[color-mix(in_srgb,var(--danger)_8%,white)]";

function relationshipLabel(r: string) {
  return (RELATIONSHIP as Record<string, string>)[r] ?? r;
}

function SafetyNote({ text }: { text: string }) {
  return (
    <p role="note" className="flex gap-2.5 rounded-2xl bg-fill px-4 py-3.5 text-footnote text-secondary">
      <InfoIcon size={18} className="mt-px shrink-0 text-muted" />
      <span>{text}</span>
    </p>
  );
}

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
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    fetch("/api/sample/family")
      .then((r) => r.json())
      .then((d) => setFamily(d.family ?? []))
      .catch(() => setFamily([]));
  }, []);

  // Braces matter: in current Chrome, smooth scrollIntoView() returns a Promise. Returning it from the
  // effect makes React treat it as a cleanup function and crash ("u is not a function") on the next message.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const people = family.length ? family : FALLBACK_FAMILY;
  const member = people.find((m) => m.id === memberId);
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Wellness check-in"
        subtitle="A quick, friendly AI check-in about sleep, energy, pain, mood and medications. Chat here, or FaceTime iCare from an iPhone."
      />

      <SafetyNote text={DISCLAIMER} />

      {/* Real FaceTime call to iCare's Chert line; the chert-agent answers (TD). */}
      <FaceTimeCall />

      <Card
        title={
          <span className="flex items-center gap-3">
            <Avatar id={memberId} name={member?.name ?? firstName} size={40} />
            <span className="min-w-0">
              <span className="block">Check-in with {firstName}</span>
              {member && (
                <span className="block text-footnote font-normal text-secondary">
                  {relationshipLabel(member.relationship)} · {member.age}
                </span>
              )}
            </span>
          </span>
        }
        action={
          started && (
            <button onClick={() => reset()} className="btn btn-tertiary">
              Start over
            </button>
          )
        }
      >
        <div className="mb-5">
          <SegmentedControl
            ariaLabel="Choose a family member"
            options={people.map((m) => ({ value: m.id, label: m.name.split(" ")[0] }))}
            value={memberId}
            onChange={(id) => reset(id)}
          />
        </div>

        {!started ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-muted px-5 py-8 text-center">
            <span aria-hidden className="grid h-12 w-12 place-items-center rounded-[14px] bg-gradient-to-b from-[#16a3a1] to-brand text-white shadow-sm">
              <VideoIcon size={26} />
            </span>
            <p className="max-w-sm text-subhead text-secondary">
              iCare asks {firstName} a few short questions, then sums up how they&apos;re doing and a suggested next step.
            </p>
            <button onClick={start} className="btn btn-primary">
              Start check-in
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ul className="-mx-1 flex max-h-[28rem] flex-col gap-2 overflow-y-auto px-1 py-1" aria-live="polite" aria-label="Conversation">
              {messages.map((m, i) =>
                m.emergency ? (
                  <li key={i} role="alert" className={`max-w-[88%] self-start rounded-[20px] rounded-bl-md border-2 border-danger px-4 py-3 ${DANGER_SOFT}`}>
                    <span className="mb-1 flex items-center gap-1.5 text-footnote font-bold uppercase tracking-wide text-danger">
                      <WarningIcon size={16} strokeWidth={2.4} /> Get help now
                    </span>
                    <span className="text-[17px] font-medium leading-snug text-foreground">{m.text}</span>
                  </li>
                ) : (
                  <li
                    key={i}
                    className={`max-w-[85%] whitespace-pre-wrap rounded-[20px] px-4 py-2.5 text-[17px] leading-snug ${
                      m.role === "user" ? "self-end rounded-br-md bg-brand text-white" : "self-start rounded-bl-md bg-fill text-foreground"
                    }`}
                  >
                    <span className="sr-only">{m.role === "user" ? `${firstName}: ` : "iCare: "}</span>
                    {m.text}
                  </li>
                ),
              )}
              {loading && (
                <li className="flex items-center gap-1 self-start rounded-[20px] rounded-bl-md bg-fill px-4 py-3.5">
                  <span className="sr-only">iCare is typing…</span>
                  {[0, 150, 300].map((d) => (
                    <span key={d} aria-hidden className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-muted)]" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </li>
              )}
              <li ref={endRef} aria-hidden className="h-px" />
            </ul>

            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-2xl bg-warn-soft px-4 py-3 text-footnote font-medium text-warn">
                <WarningIcon size={17} className="mt-px shrink-0" />
                {error}
              </p>
            )}

            {summary && (
              <div className="rounded-2xl bg-brand-soft p-4 sm:p-5">
                <h3 className="text-headline text-[var(--brand-pressed)]">Check-in summary</h3>
                <ul className="ml-5 mt-2 flex list-disc flex-col gap-1 text-subhead marker:text-brand">
                  {summary.points.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
                {summary.nextStep && (
                  <p className="mt-3 text-subhead">
                    <span className="font-semibold">Suggested next step: </span>
                    {summary.nextStep}
                  </p>
                )}
              </div>
            )}

            {!done ? (
              <form onSubmit={submit} className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={1000}
                  placeholder="Type your answer…"
                  aria-label="Your answer"
                  className="min-h-11 min-w-0 flex-1 rounded-full bg-fill px-4 text-[17px] text-foreground outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-brand/50 disabled:opacity-60"
                  disabled={loading}
                />
                <button type="submit" disabled={loading || !input.trim()} className="btn btn-primary disabled:opacity-40">
                  Send
                </button>
              </form>
            ) : (
              <p className="text-footnote text-secondary">This check-in is finished. Use “Start over” to begin a new one.</p>
            )}
          </div>
        )}
      </Card>

      {/* FaceTime check-in summaries saved by the Chert agent; a new one appears here after a call ends. */}
      <CheckinHistory />

      <SummaryPanel key={memberId} memberId={memberId} firstName={firstName} />
    </div>
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
    <Card title={`${firstName}'s health summary`} subtitle="Written by AI from the last month or year of health data">
      <div className="flex flex-wrap gap-2">
        {(["month", "year"] as const).map((p) => (
          <button
            key={p}
            onClick={() => load(p)}
            disabled={loading}
            aria-pressed={period === p}
            className={`btn disabled:opacity-50 ${period === p ? "btn-primary" : "btn-secondary"}`}
          >
            Get my {p === "month" ? "monthly" : "yearly"} summary
          </button>
        ))}
      </div>

      {loading && (
        <div className="mt-5 flex flex-col gap-2.5" aria-live="polite">
          <span className="sr-only">Writing {firstName}&apos;s summary…</span>
          <Skeleton className="h-6 w-3/4 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-5/6 rounded-md" />
        </div>
      )}

      {data?.error && (
        <div className="mt-5">
          <ErrorNote message={data.error} onRetry={period ? () => load(period) : undefined} />
        </div>
      )}

      {s && (
        <div className="mt-5 flex flex-col gap-4">
          <p className="text-footnote text-muted">
            {data?.range} · data from {data?.dataSource}
            {data?.cached ? " · cached" : ""}
          </p>
          <p className="text-title2">{s.headline}</p>
          <ul className="ml-5 flex list-disc flex-col gap-1.5 text-subhead marker:text-brand">
            {s.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
          {s.watchItems.length > 0 && (
            <div className="rounded-2xl bg-warn-soft p-4">
              <p className="flex items-center gap-1.5 text-subhead font-semibold text-warn">
                <WarningIcon size={17} /> Worth discussing with your doctor
              </p>
              <ul className="ml-5 mt-1.5 flex list-disc flex-col gap-1 text-subhead text-foreground">
                {s.watchItems.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-subhead italic text-secondary">{s.encouragement}</p>
        </div>
      )}
      {data && !s && data.raw && <p className="mt-5 whitespace-pre-wrap text-subhead">{data.raw}</p>}
      {data?.disclaimer && (
        <div className="mt-5">
          <SafetyNote text={data.disclaimer} />
        </div>
      )}
    </Card>
  );
}

"use client";
// Medication reminders and dose tracking for one person (Cam). Shown on /family/<id> to that person and to
// Full connections. Logging doses and changing reminders needs "act" (the person, or their guardian).
// Data: /api/reminders/<memberId>. iCare never suggests doses: schedules are copied from the prescription label.
import { useMemo, useState, type ReactNode } from "react";
import Card from "@/components/Card";
import ConfirmSheet from "@/components/ConfirmSheet";
import { PillIcon } from "@/components/Icons";
import { CardSkeleton, ErrorNote } from "@/components/Status";
import { useJson } from "@/components/useJson";
import { api } from "@/components/useMe";
import { clockLabel, medicineLabel } from "@/lib/reminders/labels";

type DoseStatus = "taken" | "skipped" | "due" | "upcoming" | "missed";
interface Dose {
  scheduleId: number;
  medicine: string;
  label: string;
  time: string;
  date: string;
  scheduledFor: string;
  status: DoseStatus;
  loggedBy: string | null;
  generated: boolean;
}
interface Schedule {
  id: number;
  medicine: string;
  label: string;
  times: string[];
}
interface RemindersResponse {
  schedules: Schedule[];
  doses: Dose[];
  adherence: { taken: number; missed: number; skipped: number; total: number; percent: number | null };
  canAct: boolean;
  note: string;
}

const STATUS: Record<DoseStatus, { text: string; cls: string; mark: string }> = {
  taken: { text: "Taken", cls: "bg-good-soft text-good", mark: "✓" },
  skipped: { text: "Skipped", cls: "bg-fill text-secondary", mark: "–" },
  due: { text: "Due now", cls: "bg-warn-soft text-warn", mark: "!" },
  upcoming: { text: "Later today", cls: "bg-fill text-secondary", mark: "·" },
  missed: { text: "Missed", cls: "bg-[#fde8e6] text-danger", mark: "✕" },
};

/** Same content without the card frame, for use inside a profile card. */
function BareCard({ children }: { children: ReactNode; title?: ReactNode; subtitle?: ReactNode }) {
  return <div>{children}</div>;
}

const medicineName = medicineLabel;
const clock = clockLabel;

const weekday = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

function Chip({ status }: { status: DoseStatus }) {
  const s = STATUS[status];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption font-semibold ${s.cls}`}>{s.text}</span>;
}

export default function MedReminders({ memberId, firstName, self, medicines, bare = false }: { memberId: string; firstName: string; self: boolean; medicines: string[]; bare?: boolean }) {
  const Wrapper = (bare ? BareCard : Card) as typeof Card;
  const { data, error, loading, retry } = useJson<RemindersResponse>(`/api/reminders/${memberId}?days=7`);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Schedule | null>(null);

  const today = data?.doses.at(-1)?.date;
  const days = useMemo(() => [...new Set((data?.doses ?? []).map((d) => d.date))], [data]);
  const rows = useMemo(() => {
    const seen = new Map<string, { scheduleId: number; medicine: string; time: string }>();
    for (const d of data?.doses ?? []) seen.set(`${d.scheduleId}|${d.time}`, { scheduleId: d.scheduleId, medicine: d.medicine, time: d.time });
    return [...seen.values()].sort((a, b) => a.time.localeCompare(b.time) || a.medicine.localeCompare(b.medicine));
  }, [data]);

  if (error) return <ErrorNote message={error} onRetry={retry} />;
  if (loading && !data) return <CardSkeleton lines={2} />;
  if (!data) return null;

  const todays = data.doses.filter((d) => d.date === today);
  const recentMissed = data.doses.filter((d) => d.status === "missed" && d.date !== today && Date.now() - new Date(d.scheduledFor).getTime() < 48 * 3600_000);
  const whose = self ? "your" : `${firstName}'s`;

  async function log(d: Dose, status: "taken" | "skipped") {
    setBusy(d.scheduledFor + d.scheduleId);
    setMsg(null);
    try {
      await api(`/api/reminders/${memberId}`, { method: "POST", body: JSON.stringify({ action: "log", scheduleId: d.scheduleId, scheduledFor: d.scheduledFor, status }) });
      setMsg(`${medicineName(d.medicine)} ${clock(d.time)} logged as ${status}.`);
      retry();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't save that.");
    } finally {
      setBusy(null);
    }
  }

  const doseRow = (d: Dose, late = false) => (
    <li key={d.scheduleId + d.scheduledFor} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0 [&+&]:border-t [&+&]:border-line">
      <span className="w-[76px] shrink-0 font-[family-name:var(--font-rounded)] text-subhead font-semibold tabular-nums">
        {late ? weekday(d.date) : clock(d.time)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-subhead font-semibold">{medicineName(d.medicine)}</span>
        <span className="block text-footnote text-secondary">{late ? `${clock(d.time)} · ${d.label}` : d.label}</span>
      </span>
      <Chip status={d.status} />
      {data.canAct && (d.status === "due" || d.status === "upcoming" || d.status === "missed") && (
        <button className="btn btn-primary min-h-11 px-4" disabled={busy !== null} onClick={() => log(d, "taken")}>
          {d.status === "missed" ? "Log as taken" : "Taken"}
        </button>
      )}
    </li>
  );

  return (
    <Wrapper
      title={
        <span className="flex items-center gap-2">
          <PillIcon size={20} className="text-brand" /> Medication reminders
        </span>
      }
      subtitle={
        data.adherence.percent != null
          ? `${data.adherence.percent}% of ${whose} doses taken in the last 7 days (${data.adherence.missed} missed)`
          : "From the prescription label"
      }
    >
      {data.schedules.length === 0 ? (
        <p className="text-subhead text-secondary">No reminders yet{medicines.length ? `. Add one from ${whose} prescription label.` : "."}</p>
      ) : (
        <>
          <h3 className="mb-2 text-footnote font-semibold uppercase tracking-wide text-muted">Today</h3>
          <ul>{todays.map((d) => doseRow(d))}</ul>

          {recentMissed.length > 0 && (
            <>
              <h3 className="mb-2 mt-5 text-footnote font-semibold uppercase tracking-wide text-danger">Missed in the last 2 days</h3>
              <ul>{recentMissed.map((d) => doseRow(d, true))}</ul>
            </>
          )}

          <h3 className="mb-2 mt-5 text-footnote font-semibold uppercase tracking-wide text-muted">Last 7 days</h3>
          <div className="relative -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[420px] border-separate border-spacing-y-1 text-footnote">
              <thead>
                <tr>
                  <th className="pr-2 text-left font-medium text-muted">
                    <span className="sr-only">Dose</span>
                  </th>
                  {days.map((day) => (
                    <th key={day} className={`px-1 text-center font-medium ${day === today ? "text-foreground" : "text-muted"}`}>
                      {day === today ? "Today" : weekday(day)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.scheduleId}|${r.time}`}>
                    <th scope="row" className="whitespace-nowrap pr-2 text-left font-semibold">
                      {medicineName(r.medicine)} <span className="font-normal text-secondary">{clock(r.time)}</span>
                    </th>
                    {days.map((day) => {
                      const d = data.doses.find((x) => x.scheduleId === r.scheduleId && x.time === r.time && x.date === day);
                      if (!d) return <td key={day} />;
                      const s = STATUS[d.status];
                      return (
                        <td key={day} className="px-1 text-center">
                          <span title={`${weekday(day)} ${clock(d.time)}: ${s.text}`} className={`inline-grid h-7 w-7 place-items-center rounded-full text-caption font-bold ${s.cls}`}>
                            <span aria-hidden>{s.mark}</span>
                            <span className="sr-only">{s.text}</span>
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {msg && (
        <p role="status" className="mt-4 rounded-xl bg-fill px-4 py-3 text-subhead">
          {msg}
        </p>
      )}

      {data.canAct && (
        <div className="mt-5 border-t border-line pt-4">
          {data.schedules.length > 0 && (
            <ul className="mb-3 flex flex-wrap gap-2">
              {data.schedules.map((s) => (
                <li key={s.id} className="inline-flex items-center gap-1 rounded-full bg-fill py-1 pl-3 pr-1 text-footnote">
                  {medicineName(s.medicine)} · {s.times.map(clock).join(", ")}
                  <button className="min-h-8 rounded-full px-2 font-semibold text-danger hover:bg-[var(--fill-strong)]" onClick={() => setRemoving(s)} aria-label={`Remove the ${s.medicine} reminder`}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {adding ? (
            <AddReminder
              medicines={medicines}
              onCancel={() => setAdding(false)}
              onSave={async (medicine, times, label) => {
                await api(`/api/reminders/${memberId}`, { method: "POST", body: JSON.stringify({ action: "add", medicine, times, label }) });
                setAdding(false);
                setMsg(`Reminder added for ${medicineName(medicine)}.`);
                retry();
              }}
            />
          ) : (
            <button className="btn btn-secondary" onClick={() => setAdding(true)}>
              Add a reminder
            </button>
          )}
        </div>
      )}

      <p className="mt-4 text-caption text-muted">
        {data.note}
        {data.doses.some((d) => d.generated) && " Earlier days are generated demo history; anything you tap is saved in Tiger Data."}
        {" "}In the iPhone app, reminders would arrive as notifications on iPhone and Apple Watch.
      </p>

      <ConfirmSheet
        open={removing !== null}
        title={`Remove the ${removing ? medicineName(removing.medicine) : ""} reminder?`}
        warning={self ? "You'll stop getting reminders for it. Your dose history is kept." : `${firstName} will stop getting reminders for it. The dose history is kept.`}
        confirmLabel="Remove reminder"
        destructive
        busy={busy === "remove"}
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          setBusy("remove");
          try {
            await api(`/api/reminders/${memberId}`, { method: "POST", body: JSON.stringify({ action: "remove", scheduleId: removing.id }) });
            setMsg(`Removed the ${medicineName(removing.medicine)} reminder.`);
            retry();
          } catch (e) {
            setMsg(e instanceof Error ? e.message : "Couldn't remove it.");
          } finally {
            setBusy(null);
            setRemoving(null);
          }
        }}
      />
    </Wrapper>
  );
}

function AddReminder({ medicines, onSave, onCancel }: { medicines: string[]; onSave: (m: string, t: string[], l: string) => Promise<void>; onCancel: () => void }) {
  const [medicine, setMedicine] = useState(medicines[0] ?? "");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [label, setLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setErr(null);
        try {
          await onSave(medicine, times.filter(Boolean), label);
        } catch (x) {
          setErr(x instanceof Error ? x.message : "Couldn't save.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <label className="flex flex-col gap-1 text-footnote font-semibold text-secondary">
        Medicine
        <input
          list="reminder-medicines"
          value={medicine}
          onChange={(e) => setMedicine(e.target.value)}
          required
          className="min-h-11 rounded-xl bg-fill px-3 text-subhead font-normal text-foreground outline-none"
        />
        <datalist id="reminder-medicines">
          {medicines.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </label>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-footnote font-semibold text-secondary">Times on the label</legend>
        <div className="flex flex-wrap items-center gap-2">
          {times.map((t, i) => (
            <input
              key={i}
              type="time"
              value={t}
              aria-label={`Time ${i + 1}`}
              onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))}
              className="min-h-11 rounded-xl bg-fill px-3 text-subhead outline-none"
            />
          ))}
          {times.length < 6 && (
            <button type="button" className="btn btn-tertiary" onClick={() => setTimes([...times, "20:00"])}>
              + Another time
            </button>
          )}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1 text-footnote font-semibold text-secondary">
        What the label says (optional)
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. 1 tablet with food"
          maxLength={80}
          className="min-h-11 rounded-xl bg-fill px-3 text-subhead font-normal text-foreground outline-none"
        />
      </label>
      {err && <p className="text-footnote text-danger">{err}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save reminder"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

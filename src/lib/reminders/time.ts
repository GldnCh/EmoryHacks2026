// Time-zone helpers without a library: medicine times are local ("08:00" in America/New_York) and turn into
// exact instants per day, correctly across daylight-saving changes.

const partsFmt = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string) {
  let f = partsFmt.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    partsFmt.set(tz, f);
  }
  return f;
}

function wallClock(t: number, tz: string) {
  const p = Object.fromEntries(fmt(tz).formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, s: +p.second };
}

/** Milliseconds the zone is ahead of UTC at instant t. */
function offset(t: number, tz: string) {
  const w = wallClock(t, tz);
  return Date.UTC(w.y, w.m - 1, w.d, w.h, w.min, w.s) - Math.floor(t / 1000) * 1000;
}

/** The instant of local date + time in a zone, e.g. ("2026-11-14", "20:00", "America/New_York"). */
export function zonedInstant(date: string, hhmm: string, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, min);
  let t = guess - offset(guess, tz);
  t = guess - offset(t, tz); // second pass settles DST edges
  return new Date(t);
}

/** Local calendar date (YYYY-MM-DD) of an instant in a zone. */
export function localDate(t: Date | number, tz: string): string {
  const w = wallClock(typeof t === "number" ? t : t.getTime(), tz);
  return `${w.y}-${String(w.m).padStart(2, "0")}-${String(w.d).padStart(2, "0")}`;
}

/** YYYY-MM-DD plus n days (calendar arithmetic, no zone involved). */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export const isHHMM = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

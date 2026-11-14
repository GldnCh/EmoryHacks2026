# Accounts, family sharing and permissions

iCare knows **who is using it on this device**, and every feature checks **what that person may see or do with someone else's data**.

## For users
iCare is designed as a **native iPhone app** that sits alongside **Apple Health, Fitness, Apple Watch and AirPods** (heart rate, activity, sleep, blood pressure, and safety alerts like falls, irregular rhythm and loud-noise exposure). **The iPhone is the identity**: there's no sign-in and nothing expires.

- **One-time setup** (`/setup`): the web demo asks once, *"Whose iPhone is this?"* (the native app knows this from the device). After that iCare always opens straight to your health.
- **Connecting your iCare with someone** (`/account` → *Connect with someone*): you choose what **they** will see of you, review a **warning**, and send a **request**. Nothing is shared until they **accept** on their iPhone, and when they do, they choose what **you** see of them (or nothing). It's a one-time connection that stays until someone ends it.
- **Changing or ending it:** either person can change what the other sees, or **Disconnect** at any time, after a warning listing exactly what each side loses. Disconnecting removes sharing in both directions; reconnecting needs a new request.
- **Opening someone's iCare:** from your phone, open a connected person's iCare (e.g. Mom opens **Mia's**) up to the level they share. Anything a guardian does there is saved to **Mia's** account (so it's on her iPhone too) and logged as done by Mom.
- **Levels:**

| Level | Sees | Typical for |
|---|---|---|
| **Full** | Everything: trends, day-by-day vitals, medicines, check-ins, appointments, reminders | Kids, a parent you care for |
| **Health summary** | Monthly trends, conditions, medicines, appointments (no minute data or check-in conversations) | A partner |
| **Basic** | Whether they're okay, plus important alerts | A good friend |
| **Guardian** (on top of Full) | Can also **act for them** (book appointments, log doses) and **manage their sharing**, including adding someone directly | Parents of a child, a caregiver |

- A **child can't disconnect or downgrade a guardian**; only a guardian can end that.
- Everything is recorded in an **activity log**.
- **Demo tip:** to present another family member's phone on the same laptop, use *"pretend to be another iPhone"* at the bottom of `/account`.

## Demo family (fictional)
| Viewer → can see | Level |
|---|---|
| Jordan → Mia, Rosa | Full · Guardian |
| Sam → Mia | Full · Guardian |
| Sam → Rosa · Jordan ↔ Sam | Health summary |
| Mia → Jordan, Sam · Rosa → Jordan | Basic |
| Alex (friend) → Jordan | Basic |

Plus a pending request: **Rosa → Mia** (Grandma asks to connect; Mia can accept on her iPhone).

Reset to this anytime: `npm run seed:app -- --reset` (Cam, admin database login).

## For developers: using it in a feature
Everything lives in `src/lib/auth/`. **Server side (API routes):**
```ts
import { authorize, requireAccount, visiblePeople, withAuthErrors } from "@/lib/auth";
import { logActivity } from "@/lib/auth/store";

// GET /api/appointments?accountId=mia
export const GET = withAuthErrors(async (req: Request) => {
  const subjectId = new URL(req.url).searchParams.get("accountId") ?? (await requireAccount()).id;
  const { actor, subject } = await authorize("appointments", subjectId); // 401 if signed out, 403 if not allowed
  // ...load subject's appointments...
});

// POST: changing something FOR someone needs "act" (yourself or their guardian)
const { actor, subject } = await authorize("act", subjectId);
await logActivity(actor.id, subject.id, "appointment.create", { providerNpi });
```
- `withAuthErrors` turns a failed check into a JSON **401/403** instead of a crash.
- Capabilities: `profile`, `conditions`, `trends`, `vitals`, `medications`, `checkins`, `appointments`, `reminders`, `act`, `manageSharing` (see `src/lib/auth/permissions.ts`).
- `account.memberId` links an account to its health data (`/api/trends/<memberId>` etc.). Alex has none. For routes keyed by member id, use `authorizeMember(capability, memberId)`.
- **Protected health routes:** `/api/trends/<id>` (`trends`), `/api/vitals/<id>` (`vitals`), `/api/checkins/<id>` (`checkins`). `/api/sample/family` and `/api/family/<id>/profile` stay public (names, conditions and medicine names of the fictional family, used by the medicine chips and specialists pages).
- Store new per-person data with an `account_id` column; add the table to `db/tiger/app-schema.sql` and its `GRANT ... TO idoc_team` line in `scripts/seed-app.mjs`, then ask Cam to run `npm run seed:app`.

**Client side (pages):**
```ts
import { useMe } from "@/components/useMe";
const { me } = useMe();          // me.account = whose iPhone this is; me.people = who they can see + capabilities
const canBook = me?.people.find((p) => p.account.id === "mia")?.capabilities.includes("act");

// People you may see, joined with their health profile, labelled from your point of view ("Mother", "Spouse"):
import { usePeople } from "@/components/usePeople";
const { me, people } = usePeople(); // people[i] = { person, member, label, can("trends") }
```
The dashboard and `/family/<id>` use this: Full and Health-summary connections get trend cards, Basic connections get a status card, and people you aren't connected to aren't shown (their page says "You're not connected with ...").

## API
| Route | What |
|---|---|
| `GET /api/device` · `POST /api/device { accountId }` | Whose iPhone this is · one-time setup (409 if already set up) |
| `DELETE /api/device` | Demo only: "pretend to be another iPhone" on this browser |
| `GET /api/auth/accounts` | Demo directory of people (setup screen, connect picker) |
| `GET /api/auth/me` | The owner, everyone they can see (level + capabilities), pending request count |
| `GET /api/connections` | Connected people (what each side sees), incoming and outgoing requests |
| `POST /api/connections { toId, level, relationship? }` | Send a request (`level` = what they'll see of you) |
| `POST /api/connections/<id> { action: "accept", level? }` | Accept (`level` = what the sender sees of you; null = nothing) |
| `GET /api/report/<memberId>` | Doctor report data + Gemini overview and questions to ask the doctor (cached 1 h, `?refresh=1`). Needs `checkins` (Full). Page: `/family/<id>/report` |
| `GET /api/alerts` | Family alerts for you and your connections: a status per person and the alerts their sharing level allows |
| `GET /api/reminders/<memberId>?days=7` | Medicine schedules, every dose in the window (taken / missed / due / upcoming), adherence, `canAct`. Needs `reminders` (Full) |
| `POST /api/reminders/<memberId>` | `{ action: "log", scheduleId, scheduledFor, status }`, `{ action: "add", medicine, times, label? }`, `{ action: "remove", scheduleId }`. Needs `act` (the person or a guardian); logged as `dose.log` / `reminder.add` / `reminder.remove` |
| `POST /api/connections/<id> { action: "decline" or "cancel" }` | Decline (recipient) or withdraw (sender) |
| `DELETE /api/connections?with=<accountId>` | Disconnect, both directions (a child can't disconnect a guardian) |
| `POST /api/sharing { subjectId?, viewerId, level }` | Change what a **connected** person sees; guardians may also add someone to the person they care for |
| `GET /api/sharing?subjectId=` · `DELETE /api/sharing?...` | Guardian view/removal of a cared-for person's sharing |

## How it works / security notes
- The device owner is a **signed cookie** (HMAC-SHA256, httpOnly, no expiry in practice). Editing it to become someone else is rejected, and a set-up device can't be re-assigned (except the demo switch). The key is `AUTH_SECRET` if set, otherwise derived from the secret database URL.
- Data lives in Tiger Data tables `accounts`, `sharing`, `connection_requests`, `activity_log` (`db/tiger/app-schema.sql`). Without a database the app uses an in-memory copy of the demo data.
- **Not yet:** the existing health pages (`/dashboard`, `/family/<id>`) and data routes are still open to everyone for the demo. Use `authorize()` in all **new** features; filtering the existing pages by `me.people` is a follow-up.
- **Native app:** the device identity comes from the iPhone (and `accounts.apple_sub` from the user's Apple account) instead of `/setup`; connections, levels and permissions stay the same. Health data comes from HealthKit instead of the demo generator.

## Medication reminders
Schedules are copied from the prescription label (`med_schedules`); every tap is saved in `dose_log`. A dose is **due** from 1 hour before to 2 hours after its time, and **missed** after that if nobody logged it. iCare never suggests doses or changes. The demo family's schedules are marked `demo`: days before today are generated relative to today (all taken, except Rosa's evening metformin and atorvastatin yesterday and 3 days ago), so the story is fresh at any demo time. Code: `src/lib/reminders/`, UI: `src/components/MedReminders.tsx` on `/family/<id>`. `npm run seed:app` creates the tables and demo schedules; `-- --reset` also clears taps.

## Family alerts
Worked out live, never stored (`src/lib/alerts.ts`, shown on `/dashboard` and `/family/<id>`):

| Alert | When | Full detail needs | Others see |
|---|---|---|---|
| **Urgent:** check-in mentioned emergency symptoms | `checkin_summaries.emergency` in the last 7 days | `checkins` | "Rosa may need help … Consider calling Rosa" (general words, no health details) |
| Missed doses | Not logged in the last 2 days | `reminders` | Status only |
| Blood pressure running high | Latest week of readings averages ≥ 140/90 | `trends` | Status only |

Every connection also sees a coarse status: **Doing okay**, **May need a check-in** or **Needs attention now**. Alerts state facts and suggest calling or contacting a clinician; they never give medical advice.

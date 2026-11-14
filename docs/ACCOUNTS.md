# Accounts, family sharing and permissions

iCare knows **who is using it on this device**, and every feature checks **what that person may see or do with someone else's data**.

## For users
- **Sign in** (`/signin`): demo stand-in for **Sign in with Apple**. Pick a demo account (Jordan, Sam, Mia, Rosa or their friend Alex). The phone remembers you for 30 days.
- **One device, many people** (`/account` → *This device*): Mia borrows Mom's phone → **Use as Mia**. Everything she does is saved to **Mia's** account, so it's on her own phone later. Mom taps **Use as Jordan** to switch back.
- **Family Sharing** (`/account` → *Who can see your health*): you choose who sees your data and how much:

| Level | Sees | Typical for |
|---|---|---|
| **Full** | Everything: trends, day-by-day vitals, medicines, check-ins, appointments, reminders | Kids, a parent you care for |
| **Health summary** | Monthly trends, conditions, medicines, appointments (no minute data or check-in conversations) | A partner |
| **Basic** | Whether they're okay, plus important alerts | A good friend |
| **Guardian** (on top of Full) | Can also **act for them** (book appointments, log doses) and **manage their sharing** | Parents of a child, a caregiver |

- A **child can't remove or downgrade their guardians** or appoint new ones; guardians manage that.
- Everything is recorded in an **activity log** (who did what on whose account, and on whose device).

## Demo family (fictional)
| Viewer → can see | Level |
|---|---|
| Jordan → Mia, Rosa | Full · Guardian |
| Sam → Mia | Full · Guardian |
| Sam → Rosa · Jordan ↔ Sam | Health summary |
| Mia → Jordan, Sam · Rosa → Jordan | Basic |
| Alex (friend) → Jordan | Basic |

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
- `account.memberId` links an account to its health data (`/api/trends/<memberId>` etc.). Alex has none.
- Store new per-person data with an `account_id` column; add the table to `db/tiger/app-schema.sql` and its `GRANT ... TO idoc_team` line in `scripts/seed-app.mjs`, then ask Cam to run `npm run seed:app`.

**Client side (pages):**
```ts
import { useMe, signInAs } from "@/components/useMe";
const { me } = useMe();          // me.account = who's using iCare; me.people = who they can see + capabilities
const canBook = me?.people.find((p) => p.account.id === "mia")?.capabilities.includes("act");
```

## API
| Route | What |
|---|---|
| `GET /api/auth/accounts` | Demo account directory for the sign-in screen |
| `POST /api/auth/signin` `{ accountId }` | Sign in on this device (adds it to the device's account list) |
| `POST /api/auth/signout` | Sign out (the device still remembers the account for quick switching) |
| `POST /api/auth/forget` `{ accountId }` | Remove an account from this device |
| `GET /api/auth/me` | Current account, device accounts, everyone they can see with level + capabilities |
| `GET /api/sharing[?subjectId=]` | Who can see this person (yours, or someone you're guardian of) |
| `POST /api/sharing` `{ subjectId?, viewerId, level, relationship?, guardian? }` | Add or change sharing |
| `DELETE /api/sharing?subjectId=&viewerId=` | Stop sharing |

## How it works / security notes
- Sessions are **signed cookies** (HMAC-SHA256, httpOnly, 30 days). Editing a cookie to become someone else is rejected. The key is `AUTH_SECRET` if set, otherwise derived from the secret database URL.
- Data lives in Tiger Data tables `accounts`, `sharing`, `activity_log` (`db/tiger/app-schema.sql`). Without a database the app uses an in-memory copy of the demo data.
- **Not yet:** the existing health pages (`/dashboard`, `/family/<id>`) and data routes are still open to everyone for the demo. Use `authorize()` in all **new** features; filtering the existing pages by `me.people` is a follow-up.
- **Real Sign in with Apple** later only replaces *how* you sign in (`/signin` + `accounts.apple_sub`); sessions, sharing and permissions stay the same.

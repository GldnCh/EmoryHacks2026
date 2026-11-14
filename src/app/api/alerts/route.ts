// GET /api/alerts -> family alerts for this iPhone's owner: themselves and everyone they're connected to,
// each with a coarse status ("Doing okay", "May need a check-in", "Needs attention now") and the alerts their
// sharing level allows (see src/lib/alerts.ts). Owner: Cam.
import { NextResponse } from "next/server";
import { requireAccount, visiblePeople, withAuthErrors } from "@/lib/auth";
import { alertsFor } from "@/lib/alerts";

export const dynamic = "force-dynamic";

export const GET = withAuthErrors(async () => {
  const me = await requireAccount();
  const people = (await visiblePeople(me.id)).filter((p) => p.account.memberId);
  const results = await Promise.all(
    people.map((p) =>
      alertsFor(
        { accountId: p.account.id, memberId: p.account.memberId!, firstName: p.account.displayName.split(" ")[0], self: p.self },
        p.capabilities,
      ),
    ),
  );
  return NextResponse.json({
    people: results,
    note: "Alerts are facts from check-ins, medicine logs and readings. They aren't medical advice; in an emergency call 911.",
  });
});

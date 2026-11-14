// Demo accounts and sharing for the fictional Rivera family (+ a friend), used by `npm run seed:app`
// and as the in-memory store when Tiger Data isn't connected. All people are fictional.
import type { Account, SharingGrant } from "./types";

export const SEED_ACCOUNTS: Account[] = [
  { id: "jordan", displayName: "Jordan Rivera", kind: "adult", memberId: "jordan" },
  { id: "sam", displayName: "Sam Rivera", kind: "adult", memberId: "sam" },
  { id: "mia", displayName: "Mia Rivera", kind: "child", memberId: "mia" },
  { id: "rosa", displayName: "Rosa Rivera", kind: "elder", memberId: "rosa" },
  { id: "alex", displayName: "Alex Chen", kind: "adult", memberId: null }, // Jordan's friend, no health data
];

// subject = whose data, viewer = who can see it.
export const SEED_SHARING: Omit<SharingGrant, "createdAt" | "updatedAt">[] = [
  // Mia (12): both parents see everything and manage her sharing
  { subjectId: "mia", viewerId: "jordan", level: "full", relationship: "parent", guardian: true, grantedBy: "jordan" },
  { subjectId: "mia", viewerId: "sam", level: "full", relationship: "parent", guardian: true, grantedBy: "sam" },
  // Rosa (71, Savannah): her son Jordan is her caregiver; her daughter-in-law sees a summary
  { subjectId: "rosa", viewerId: "jordan", level: "full", relationship: "son", guardian: true, grantedBy: "rosa" },
  { subjectId: "rosa", viewerId: "sam", level: "summary", relationship: "daughter-in-law", guardian: false, grantedBy: "rosa" },
  // Spouses share summaries with each other
  { subjectId: "jordan", viewerId: "sam", level: "summary", relationship: "spouse", guardian: false, grantedBy: "jordan" },
  { subjectId: "sam", viewerId: "jordan", level: "summary", relationship: "spouse", guardian: false, grantedBy: "sam" },
  // Mia sees that her parents are okay; Rosa sees how her son is doing
  { subjectId: "jordan", viewerId: "mia", level: "basic", relationship: "child", guardian: false, grantedBy: "jordan" },
  { subjectId: "sam", viewerId: "mia", level: "basic", relationship: "child", guardian: false, grantedBy: "sam" },
  { subjectId: "jordan", viewerId: "rosa", level: "basic", relationship: "mother", guardian: false, grantedBy: "jordan" },
  // A good friend: basic only
  { subjectId: "jordan", viewerId: "alex", level: "basic", relationship: "friend", guardian: false, grantedBy: "jordan" },
];

// A pending connection request for the demo: Grandma Rosa asks to connect with Mia (shows the accept flow).
export const SEED_REQUESTS = [{ fromId: "rosa", toId: "mia", fromLevel: "basic" as const, relationship: "grandchild" }];

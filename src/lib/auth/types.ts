export type AccountKind = "adult" | "child" | "elder";
export type Level = "full" | "summary" | "basic";

export interface Account {
  id: string;
  displayName: string;
  kind: AccountKind;
  memberId: string | null; // health-data profile (null = none connected yet)
}

export interface SharingGrant {
  subjectId: string; // whose data
  viewerId: string; // who can see it
  level: Level;
  relationship: string | null;
  guardian: boolean; // may manage the subject's sharing and act on their behalf
  grantedBy: string;
  createdAt?: string;
  updatedAt?: string;
}

/** What one account may do with another account's data. */
export type Capability =
  | "profile" // name, relationship, overall "doing okay" status and alerts
  | "conditions"
  | "trends" // monthly trends and summaries
  | "vitals" // minute/hour-level vitals, day view
  | "medications"
  | "checkins" // check-in conversations and their history
  | "appointments"
  | "reminders" // medication reminders and dose history
  | "act" // create/change things for them: appointments, reminders, dose logs
  | "manageSharing"; // change who can see their data

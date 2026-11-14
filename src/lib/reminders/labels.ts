// Display helpers shared by the reminders card (client) and family alerts (server). No server-only imports.

/** "metformin" -> "Metformin" */
export const medicineLabel = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

/** "20:00" -> "8:00 PM" */
export function clockLabel(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

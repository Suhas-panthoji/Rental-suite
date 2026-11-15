/** Date helpers. The owner operates in IST; day-level values are stored as "YYYY-MM-DD" text. */

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayISO(): string {
  return dayFmt.format(new Date()); // "YYYY-MM-DD"
}

export function currentPeriod(): string {
  return todayISO().slice(0, 7); // "YYYY-MM"
}

export function periodOf(iso: string): string {
  return iso.slice(0, 7);
}

export function daysInMonth(period: string): number {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function periodAdd(period: string, months: number): string {
  const [y, m] = period.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/** Due date for a period given a due-day (clamped to month length) */
export function dueDateOf(period: string, day: number): string {
  const d = Math.min(Math.max(day, 1), daysInMonth(period));
  return `${period}-${String(d).padStart(2, "0")}`;
}

/** ISO date for a given day-offset within a period, e.g. periodDay("2026-11", 1) */
export function periodDay(period: string, day: number): string {
  return `${period}-${String(day).padStart(2, "0")}`;
}

export function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Full months elapsed between two ISO dates (for escalation) */
export function monthsBetween(startISO: string, endISO: string): number {
  const [sy, sm] = startISO.split("-").map(Number);
  const [ey, em] = endISO.split("-").map(Number);
  return (ey - sy) * 12 + (em - sm);
}

export function formatDateIN(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[Number(m) - 1]} ${y}`;
}

export function formatPeriod(period: string): string {
  if (!period) return "";
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const [y, m] = period.split("-").map(Number);
  return `${months[m - 1]} ${y}`;
}

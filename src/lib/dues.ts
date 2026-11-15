import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { agreements, dues } from "@/db/schema";
import {
  compareISO,
  currentPeriod,
  daysInMonth,
  dueDateOf,
  monthsBetween,
  periodAdd,
  periodOf,
  todayISO,
} from "@/lib/dates";

/**
 * Monthly rent for an agreement in a given period, applying:
 * - escalation (per completed year since start, if escalationPct > 0)
 * - proration for a mid-month move-in (first period only)
 */
export function rentForPeriod(
  a: { rentPaise: number; startDate: string; escalationPct: number },
  period: string
): number {
  let base = a.rentPaise;
  if (a.escalationPct > 0) {
    const years = Math.floor(monthsBetween(a.startDate, `${period}-01`) / 12);
    if (years > 0) base = Math.round(base * Math.pow(1 + a.escalationPct / 100, years));
  }
  if (period === periodOf(a.startDate)) {
    const day = Number(a.startDate.slice(8, 10));
    if (day > 1) {
      const dim = daysInMonth(period);
      base = Math.round((base * (dim - day + 1)) / dim);
    }
  }
  return base;
}

/**
 * Idempotent "daily maintenance", safe to call on page load:
 * 1. upcoming -> active when start date reached
 * 2. active -> expired when end date passed
 * 3. generate missing monthly rent dues for active agreements (up to today)
 * 4. flag overdue dues (due date passed, balance remaining)
 */
export async function runDailyMaintenance(): Promise<void> {
  const db = getDb();
  const today = todayISO();

  await db
    .update(agreements)
    .set({ status: "active" })
    .where(and(eq(agreements.status, "upcoming"), sql`${agreements.startDate} <= ${today}`));

  await db
    .update(agreements)
    .set({ status: "expired" })
    .where(and(eq(agreements.status, "active"), sql`${agreements.endDate} < ${today}`));

  const active = await db.select().from(agreements).where(eq(agreements.status, "active"));
  const nowPeriod = currentPeriod();

  for (const a of active) {
    let p = periodOf(a.startDate);
    const endP = periodOf(a.endDate);
    let guard = 0;
    while (compareISO(p, nowPeriod) <= 0 && compareISO(p, endP) <= 0 && guard < 240) {
      const dueDate = dueDateOf(p, a.dueDay);
      if (compareISO(dueDate, today) <= 0) {
        const existing = await db
          .select({ id: dues.id })
          .from(dues)
          .where(
            and(
              eq(dues.agreementId, a.id),
              eq(dues.type, "rent"),
              eq(dues.period, p)
            )
          )
          .limit(1);
        if (existing.length === 0) {
          const amount = rentForPeriod(a, p);
          if (amount > 0) {
            await db.insert(dues).values({
              agreementId: a.id,
              type: "rent",
              period: p,
              amountPaise: amount,
              balancePaise: amount,
              dueDate,
              status: "pending",
            });
          }
        }
      }
      p = periodAdd(p, 1);
      guard++;
    }
  }

  await db
    .update(dues)
    .set({ status: "overdue" })
    .where(
      and(
        inArray(dues.status, ["pending", "partial"]),
        sql`${dues.dueDate} < ${today}`
      )
    );
}

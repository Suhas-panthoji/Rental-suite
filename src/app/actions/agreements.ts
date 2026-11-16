"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import type { Db } from "@/db";
import { agreementTenants, agreements, depositTxns, tenants, units } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { toPaise } from "@/lib/money";
import { addDaysISO, compareISO, todayISO } from "@/lib/dates";

export type FormState = { error?: string } | undefined;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

async function nextAgreementNumber(db: Db, year: string): Promise<string> {
  const rows = await db
    .select({ number: agreements.number })
    .from(agreements)
    .where(sql`${agreements.number} LIKE ${`AGR-${year}-%`}`);
  let max = 0;
  for (const r of rows) {
    const n = Number(r.number.split("-")[2]);
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `AGR-${year}-${String(max + 1).padStart(3, "0")}`;
}

const createSchema = z.object({
  unitId: z.coerce.number().int().positive("Select a unit"),
  type: z.enum(["rent", "lease"]),
  startDate: z.string().regex(ISO_DATE, "Enter a valid start date"),
  endDate: z.string().regex(ISO_DATE, "Enter a valid end date"),
  rent: z.string().min(1, "Enter the monthly rent"),
  dueDay: z.coerce.number().int().min(1).max(28),
  noticeDays: z.coerce.number().int().min(0).max(365).default(30),
  escalationPct: z.coerce.number().int().min(0).max(50).default(0),
  advance: z.string().default("0"),
  advanceDate: z.string().default(""),
  advanceMode: z.enum(["cash", "upi", "bank", "cheque", "other"]).default("cash"),
  advanceReference: z.string().default(""),
  terms: z.string().default(""),
});

export async function createAgreementAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const d = parsed.data;
  if (compareISO(d.endDate, d.startDate) <= 0) {
    return { error: "End date must be after the start date." };
  }

  const db = getDb();
  const tenantIds = [...new Set(formData.getAll("tenantIds").map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0))];
  if (tenantIds.length === 0) return { error: "Select at least one tenant." };

  const tRows = await db.select({ id: tenants.id }).from(tenants).where(inArray(tenants.id, tenantIds));
  if (tRows.length !== tenantIds.length) return { error: "One of the selected tenants no longer exists." };

  const uRows = await db.select().from(units).where(eq(units.id, d.unitId)).limit(1);
  if (uRows.length === 0) return { error: "Select a valid unit." };

  const overlapping = await db
    .select({ id: agreements.id, number: agreements.number })
    .from(agreements)
    .where(
      and(
        eq(agreements.unitId, d.unitId),
        inArray(agreements.status, ["active", "upcoming"]),
        sql`${agreements.startDate} <= ${d.endDate}`,
        sql`${agreements.endDate} >= ${d.startDate}`
      )
    );
  if (overlapping.length > 0) {
    return { error: `This unit already has ${overlapping[0].number} overlapping those dates.` };
  }

  const today = todayISO();
  const status = compareISO(d.startDate, today) > 0 ? "upcoming" : "active";
  const number = await nextAgreementNumber(db, d.startDate.slice(0, 4));

  const [ag] = await db
    .insert(agreements)
    .values({
      number,
      type: d.type,
      unitId: d.unitId,
      startDate: d.startDate,
      endDate: d.endDate,
      rentPaise: toPaise(d.rent),
      dueDay: d.dueDay,
      noticeDays: d.noticeDays,
      escalationPct: d.escalationPct,
      status,
      terms: d.terms,
    })
    .returning();

  await db.insert(agreementTenants).values(
    tenantIds.map((tid, i) => ({ agreementId: ag.id, tenantId: tid, isPrimary: i === 0 }))
  );

  const advancePaise = toPaise(d.advance || "0");
  if (advancePaise > 0) {
    await db.insert(depositTxns).values({
      agreementId: ag.id,
      type: "received",
      amountPaise: advancePaise,
      date: ISO_DATE.test(d.advanceDate) ? d.advanceDate : d.startDate,
      mode: d.advanceMode,
      reference: d.advanceReference,
      reason: "Advance received at agreement start",
    });
  }

  await logAudit({ entity: "agreement", entityId: ag.id, action: "create", after: { number, ...d, tenantIds }, userId: user.id });
  revalidatePath("/agreements");
  revalidatePath("/dashboard");
  revalidatePath(`/units/${d.unitId}`);
  redirect(`/agreements/${ag.id}`);
}

/** Renew: end the current agreement and create its successor on the same unit (deposit carries forward). */
export async function renewAgreement(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const backTo = `/agreements/${id}`;
  if (!id) redirect("/agreements");

  const newEndDate = String(formData.get("newEndDate") || "");
  const rentRaw = String(formData.get("newRent") || "");
  const addAdvRaw = String(formData.get("additionalAdvance") || "0");
  const mode = String(formData.get("mode") || "cash");
  const reference = String(formData.get("reference") || "");

  if (!ISO_DATE.test(newEndDate)) redirect(`${backTo}?error=Provide+the+new+end+date`);

  const db = getDb();
  const rows = await db.select().from(agreements).where(eq(agreements.id, id)).limit(1);
  const old = rows[0];
  if (!old) redirect("/agreements");
  if (old.status !== "active" && old.status !== "upcoming") {
    redirect(`${backTo}?error=Only+active+agreements+can+be+renewed`);
  }
  if (compareISO(newEndDate, old.endDate) <= 0) {
    redirect(`${backTo}?error=New+end+date+must+be+after+the+current+end+date`);
  }

  const newStart = addDaysISO(old.endDate, 1);
  if (compareISO(newEndDate, newStart) <= 0) {
    redirect(`${backTo}?error=New+end+date+must+be+after+the+renewal+start`);
  }

  // Deposit held under the old agreement (carried forward to the successor)
  const [held] = await db
    .select({ total: sql<number>`coalesce(sum(${depositTxns.amountPaise}), 0)` })
    .from(depositTxns)
    .where(and(eq(depositTxns.agreementId, old.id), inArray(depositTxns.type, ["received", "topup"])));
  const carriedPaise = Number(held?.total ?? 0);

  const number = await nextAgreementNumber(db, newStart.slice(0, 4));
  const today = todayISO();
  const [ag] = await db
    .insert(agreements)
    .values({
      number,
      type: old.type,
      unitId: old.unitId,
      startDate: newStart,
      endDate: newEndDate,
      rentPaise: rentRaw ? toPaise(rentRaw) : old.rentPaise,
      dueDay: old.dueDay,
      noticeDays: old.noticeDays,
      escalationPct: old.escalationPct,
      status: compareISO(newStart, today) > 0 ? "upcoming" : "active",
      terms: old.terms,
      supersededById: null,
    })
    .returning();

  if (old.status === "active" || old.status === "upcoming") {
    await db
      .update(agreements)
      .set({ status: "expired", supersededById: ag.id })
      .where(eq(agreements.id, old.id));
  }

  // Carry the deposit into the successor's ledger, plus any additional top-up
  if (carriedPaise > 0) {
    await db.insert(depositTxns).values({
      agreementId: ag.id,
      type: "received",
      amountPaise: carriedPaise,
      date: newStart,
      mode: "carried",
      reference: old.number,
      reason: `Advance carried forward from ${old.number}`,
    });
  }
  const addPaise = toPaise(addAdvRaw || "0");
  if (addPaise > 0) {
    await db.insert(depositTxns).values({
      agreementId: ag.id,
      type: "topup",
      amountPaise: addPaise,
      date: newStart,
      mode,
      reference,
      reason: "Additional advance on renewal",
    });
  }

  await logAudit({ entity: "agreement", entityId: ag.id, action: "create", after: { renewedFrom: old.number, number }, userId: user.id });
  await logAudit({ entity: "agreement", entityId: old.id, action: "update", before: { status: old.status }, after: { status: "expired", supersededById: ag.id }, userId: user.id });

  revalidatePath("/agreements");
  revalidatePath("/dashboard");
  revalidatePath(`/units/${old.unitId}`);
  redirect(`/agreements/${ag.id}`);
}

/** Terminate early (full settlement wizard comes in M3). */
export async function terminateAgreement(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const backTo = `/agreements/${id}`;
  if (!id) redirect("/agreements");

  const terminatedOn = String(formData.get("terminatedOn") || todayISO());
  const reason = String(formData.get("reason") || "");

  const db = getDb();
  const rows = await db.select().from(agreements).where(eq(agreements.id, id)).limit(1);
  const ag = rows[0];
  if (!ag) redirect("/agreements");
  if (ag.status !== "active" && ag.status !== "upcoming") {
    redirect(`${backTo}?error=Only+active+agreements+can+be+terminated`);
  }
  if (!ISO_DATE.test(terminatedOn) || compareISO(terminatedOn, ag.startDate) < 0) {
    redirect(`${backTo}?error=Termination+date+cannot+be+before+the+start+date`);
  }

  await db
    .update(agreements)
    .set({ status: "terminated", terminatedOn, terminatedReason: reason })
    .where(eq(agreements.id, id));

  await logAudit({
    entity: "agreement",
    entityId: id,
    action: "update",
    before: { status: ag.status },
    after: { status: "terminated", terminatedOn, reason },
    userId: user.id,
  });

  revalidatePath("/agreements");
  revalidatePath("/dashboard");
  revalidatePath(`/units/${ag.unitId}`);
  redirect(backTo);
}

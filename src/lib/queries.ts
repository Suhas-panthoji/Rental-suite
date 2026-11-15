import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  agreementTenants,
  agreements,
  depositTxns,
  dues,
  payments,
  properties,
  tenants,
  units,
} from "@/db/schema";
import { addDaysISO, currentPeriod, todayISO } from "@/lib/dates";

const num = (v: unknown) => Number(v ?? 0);

/** Primary tenant name for each agreement id */
export async function primaryTenantNames(
  agreementIds: number[]
): Promise<Record<number, string>> {
  if (agreementIds.length === 0) return {};
  const rows = await getDb()
    .select({ agreementId: agreementTenants.agreementId, name: tenants.name })
    .from(agreementTenants)
    .innerJoin(tenants, eq(agreementTenants.tenantId, tenants.id))
    .where(and(inArray(agreementTenants.agreementId, agreementIds), eq(agreementTenants.isPrimary, true)));
  return Object.fromEntries(rows.map((r) => [r.agreementId, r.name]));
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData() {
  const db = getDb();
  const today = todayISO();
  const period = currentPeriod();
  const expiryCutoff = addDaysISO(today, 90);

  const [unitAgg] = await db
    .select({
      total: sql<number>`count(*)`,
      maintenance: sql<number>`sum(case when ${units.status} = 'maintenance' then 1 else 0 end)`,
    })
    .from(units);

  const [occupiedAgg] = await db
    .select({ n: sql<number>`count(distinct ${agreements.unitId})` })
    .from(agreements)
    .where(eq(agreements.status, "active"));

  const [dueAgg] = await db
    .select({ total: sql<number>`coalesce(sum(${dues.amountPaise}), 0)` })
    .from(dues)
    .where(and(eq(dues.type, "rent"), eq(dues.period, period)));

  const [collectedAgg] = await db
    .select({ total: sql<number>`coalesce(sum(${payments.amountPaise}), 0)` })
    .from(payments)
    .where(sql`substr(${payments.date}, 1, 7) = ${period}`);

  const [overdueAgg] = await db
    .select({ total: sql<number>`coalesce(sum(${dues.balancePaise}), 0)` })
    .from(dues)
    .where(eq(dues.status, "overdue"));

  const [advancesAgg] = await db
    .select({ total: sql<number>`coalesce(sum(${depositTxns.amountPaise}), 0)` })
    .from(depositTxns)
    .innerJoin(agreements, eq(depositTxns.agreementId, agreements.id))
    .where(and(eq(agreements.status, "active"), inArray(depositTxns.type, ["received", "topup"])));

  const expiries = await db
    .select({
      id: agreements.id,
      number: agreements.number,
      endDate: agreements.endDate,
      rentPaise: agreements.rentPaise,
      unitLabel: units.label,
      propertyName: properties.name,
    })
    .from(agreements)
    .innerJoin(units, eq(agreements.unitId, units.id))
    .innerJoin(properties, eq(units.propertyId, properties.id))
    .where(and(eq(agreements.status, "active"), sql`${agreements.endDate} <= ${expiryCutoff}`))
    .orderBy(asc(agreements.endDate))
    .limit(5);

  const arrearsRows = await db
    .select({
      agreementId: dues.agreementId,
      total: sql<number>`sum(${dues.balancePaise})`,
    })
    .from(dues)
    .where(sql`${dues.balancePaise} > 0`)
    .groupBy(dues.agreementId)
    .orderBy(desc(sql`sum(${dues.balancePaise})`))
    .limit(5);

  const arrearsIds = arrearsRows.map((r) => r.agreementId);
  const arrearsAgreements = arrearsIds.length
    ? await db
        .select({
          id: agreements.id,
          number: agreements.number,
          unitLabel: units.label,
          propertyName: properties.name,
        })
        .from(agreements)
        .innerJoin(units, eq(agreements.unitId, units.id))
        .innerJoin(properties, eq(units.propertyId, properties.id))
        .where(inArray(agreements.id, arrearsIds))
    : [];
  const arrearsNames = await primaryTenantNames(arrearsIds);
  const arrearsById = Object.fromEntries(arrearsAgreements.map((a) => [a.id, a]));
  const topArrears = arrearsRows
    .map((r) => ({
      agreementId: r.agreementId,
      total: num(r.total),
      number: arrearsById[r.agreementId]?.number ?? "",
      unitLabel: arrearsById[r.agreementId]?.unitLabel ?? "",
      propertyName: arrearsById[r.agreementId]?.propertyName ?? "",
      tenantName: arrearsNames[r.agreementId] ?? "—",
    }))
    .sort((a, b) => b.total - a.total);

  const recentPayments = await db
    .select({
      id: payments.id,
      date: payments.date,
      amountPaise: payments.amountPaise,
      mode: payments.mode,
      receiptNo: payments.receiptNo,
      agreementId: payments.agreementId,
      unitLabel: units.label,
      propertyName: properties.name,
    })
    .from(payments)
    .innerJoin(agreements, eq(payments.agreementId, agreements.id))
    .innerJoin(units, eq(agreements.unitId, units.id))
    .innerJoin(properties, eq(units.propertyId, properties.id))
    .orderBy(desc(payments.date), desc(payments.id))
    .limit(5);
  const recentNames = await primaryTenantNames(recentPayments.map((p) => p.agreementId));

  const total = num(unitAgg?.total);
  const maintenance = num(unitAgg?.maintenance);
  const occupied = num(occupiedAgg?.n);

  return {
    period,
    totalUnits: total,
    occupiedUnits: occupied,
    vacantUnits: Math.max(total - occupied - maintenance, 0),
    maintenanceUnits: maintenance,
    dueThisMonth: num(dueAgg?.total),
    collectedThisMonth: num(collectedAgg?.total),
    overdueTotal: num(overdueAgg?.total),
    advancesHeld: num(advancesAgg?.total),
    expiries,
    topArrears,
    recentPayments: recentPayments.map((p) => ({ ...p, tenantName: recentNames[p.agreementId] ?? "—" })),
  };
}

/** Dues list joined with agreement/unit/property/tenant context */
export async function getDuesWithContext(statusFilter?: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: dues.id,
      type: dues.type,
      period: dues.period,
      amountPaise: dues.amountPaise,
      balancePaise: dues.balancePaise,
      status: dues.status,
      dueDate: dues.dueDate,
      agreementId: dues.agreementId,
      agreementNumber: agreements.number,
      unitLabel: units.label,
      propertyName: properties.name,
    })
    .from(dues)
    .innerJoin(agreements, eq(dues.agreementId, agreements.id))
    .innerJoin(units, eq(agreements.unitId, units.id))
    .innerJoin(properties, eq(units.propertyId, properties.id))
    .where(statusFilter ? eq(dues.status, statusFilter as "pending") : undefined)
    .orderBy(asc(dues.dueDate))
    .limit(200);
  const names = await primaryTenantNames([...new Set(rows.map((r) => r.agreementId))]);
  return rows.map((r) => ({ ...r, tenantName: names[r.agreementId] ?? "—" }));
}

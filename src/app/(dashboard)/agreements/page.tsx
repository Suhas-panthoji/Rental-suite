import Link from "next/link";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { agreementTenants, agreements, properties, tenants, units } from "@/db/schema";
import { primaryTenantNames } from "@/lib/queries";
import { formatINR } from "@/lib/money";
import { formatDateIN } from "@/lib/dates";
import {
  btnPrimary,
  Card,
  CardHead,
  EmptyState,
  PageHeader,
  StatusBadge,
  TableWrap,
  tdCls,
  thCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const FILTERS = ["all", "active", "upcoming", "expired", "terminated"] as const;

export default async function AgreementsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = FILTERS.includes((status ?? "all") as (typeof FILTERS)[number]) ? status ?? "all" : "all";

  const db = getDb();
  const rows = await db
    .select({
      id: agreements.id,
      number: agreements.number,
      type: agreements.type,
      status: agreements.status,
      startDate: agreements.startDate,
      endDate: agreements.endDate,
      rentPaise: agreements.rentPaise,
      unitLabel: units.label,
      propertyName: properties.name,
    })
    .from(agreements)
    .innerJoin(units, eq(agreements.unitId, units.id))
    .innerJoin(properties, eq(units.propertyId, properties.id))
    .where(filter === "all" ? undefined : eq(agreements.status, filter as "active"))
    .orderBy(desc(agreements.startDate))
    .limit(200);

  const ids = rows.map((r) => r.id);
  const names = await primaryTenantNames(ids);
  const coCounts = ids.length
    ? await db
        .select({ agreementId: agreementTenants.agreementId, tenantId: agreementTenants.tenantId })
        .from(agreementTenants)
        .where(inArray(agreementTenants.agreementId, ids))
    : [];
  const coMap = new Map<number, number>();
  for (const c of coCounts) coMap.set(c.agreementId, (coMap.get(c.agreementId) ?? 0) + 1);

  return (
    <>
      <PageHeader
        title="Agreements"
        subtitle="Rent and lease contracts — the source of every monthly due"
        action={
          <Link href="/agreements/new" className={btnPrimary}>
            + New agreement
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/agreements?status=${f}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${
              filter === f ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {f}
          </Link>
        ))}
      </div>

      <Card>
        <CardHead title={`Agreements (${rows.length})`} />
        {rows.length === 0 ? (
          <EmptyState
            title="No agreements yet"
            hint="An agreement moves a tenant into a unit: it defines rent, dates, due day and the advance."
            action={
              <Link href="/agreements/new" className={`${btnPrimary} mt-3`}>
                Create the first agreement
              </Link>
            }
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th className={thCls}>Number</th>
                <th className={thCls}>Tenant</th>
                <th className={thCls}>Unit</th>
                <th className={thCls}>Period</th>
                <th className={thCls}>Rent</th>
                <th className={thCls}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className={tdCls}>
                    <Link href={`/agreements/${a.id}`} className="font-medium text-blue-600">
                      {a.number}
                    </Link>
                    <span className="ml-1 text-xs uppercase text-slate-400">{a.type}</span>
                  </td>
                  <td className={tdCls}>
                    {names[a.id] ?? "—"}
                    {(coMap.get(a.id) ?? 0) > 1 && (
                      <span className="text-xs text-slate-400"> +{(coMap.get(a.id) ?? 1) - 1}</span>
                    )}
                  </td>
                  <td className={tdCls}>
                    {a.unitLabel}
                    <span className="text-xs text-slate-400"> · {a.propertyName}</span>
                  </td>
                  <td className={`${tdCls} whitespace-nowrap`}>
                    {formatDateIN(a.startDate)} → {formatDateIN(a.endDate)}
                  </td>
                  <td className={tdCls}>{formatINR(a.rentPaise)}</td>
                  <td className={tdCls}>
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
}

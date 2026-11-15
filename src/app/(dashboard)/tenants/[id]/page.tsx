import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { agreements, agreementTenants, dues, payments, properties, tenants, units } from "@/db/schema";
import { formatINR } from "@/lib/money";
import { formatDateIN } from "@/lib/dates";
import {
  btnPrimary,
  btnSecondary,
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

const ID_LABELS: Record<string, string> = {
  aadhaar: "Aadhaar",
  pan: "PAN",
  driving_licence: "Driving Licence",
  voter_id: "Voter ID",
  passport: "Passport",
  other: "Other",
};

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tid = Number(id);
  if (!tid) notFound();

  const db = getDb();
  const rows = await db.select().from(tenants).where(eq(tenants.id, tid)).limit(1);
  const tenant = rows[0];
  if (!tenant) notFound();

  const history = await db
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
    .from(agreementTenants)
    .innerJoin(agreements, eq(agreementTenants.agreementId, agreements.id))
    .innerJoin(units, eq(agreements.unitId, units.id))
    .innerJoin(properties, eq(units.propertyId, properties.id))
    .where(eq(agreementTenants.tenantId, tid))
    .orderBy(desc(agreements.startDate));

  const [collected] = await db
    .select({ total: sql<number>`coalesce(sum(${payments.amountPaise}), 0)` })
    .from(payments)
    .innerJoin(agreements, eq(payments.agreementId, agreements.id))
    .innerJoin(agreementTenants, eq(agreements.id, agreementTenants.agreementId))
    .where(eq(agreementTenants.tenantId, tid));

  const [outstanding] = await db
    .select({ total: sql<number>`coalesce(sum(${dues.balancePaise}), 0)` })
    .from(dues)
    .innerJoin(agreements, eq(dues.agreementId, agreements.id))
    .innerJoin(agreementTenants, eq(agreements.id, agreementTenants.agreementId))
    .where(and(eq(agreementTenants.tenantId, tid), sql`${dues.balancePaise} > 0`));

  const active = history.filter((h) => h.status === "active");

  return (
    <>
      <PageHeader
        title={tenant.name}
        subtitle={`${tenant.phone}${tenant.occupation ? ` · ${tenant.occupation}` : ""}`}
        action={
          <div className="flex gap-2">
            <Link href="/tenants" className={btnSecondary}>
              ← All tenants
            </Link>
            <Link href={`/tenants/${tid}/edit`} className={btnPrimary}>
              Edit
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHead title="Profile" />
          <dl className="space-y-2 p-5 text-sm">
            <Row label="Status">
              <StatusBadge status={active.length > 0 ? "active" : "vacant"} />
            </Row>
            <Row label="Phone">{tenant.phone}</Row>
            {tenant.altPhone && <Row label="Alt phone">{tenant.altPhone}</Row>}
            {tenant.email && <Row label="Email">{tenant.email}</Row>}
            {tenant.address && <Row label="Permanent address">{tenant.address}</Row>}
            {tenant.idNumber && (
              <Row label="ID">{`${ID_LABELS[tenant.idType] ?? "ID"} · ${tenant.idNumber}`}</Row>
            )}
            {tenant.emergencyContact && <Row label="Emergency">{tenant.emergencyContact}</Row>}
            {tenant.notes && <Row label="Notes">{tenant.notes}</Row>}
          </dl>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500">Total collected (all time)</div>
              <div className="mt-1 text-xl font-bold text-emerald-600">
                {formatINR(Number(collected?.total ?? 0))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500">Current outstanding</div>
              <div className={`mt-1 text-xl font-bold ${Number(outstanding?.total ?? 0) > 0 ? "text-red-600" : "text-slate-900"}`}>
                {formatINR(Number(outstanding?.total ?? 0))}
              </div>
            </div>
          </div>

          <Card>
            <CardHead title="Rental history" />
            {history.length === 0 ? (
              <EmptyState title="No agreements yet" hint="Create a rent or lease agreement to move this tenant in." />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <th className={thCls}>Agreement</th>
                    <th className={thCls}>Unit</th>
                    <th className={thCls}>Period</th>
                    <th className={thCls}>Rent</th>
                    <th className={thCls}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50">
                      <td className={tdCls}>
                        <Link href={`/agreements/${h.id}`} className="font-medium text-blue-600">
                          {h.number}
                        </Link>
                        <span className="ml-1 text-xs uppercase text-slate-400">{h.type}</span>
                      </td>
                      <td className={tdCls}>
                        {h.unitLabel}
                        <span className="text-xs text-slate-400"> · {h.propertyName}</span>
                      </td>
                      <td className={tdCls}>
                        {formatDateIN(h.startDate)} → {formatDateIN(h.endDate)}
                      </td>
                      <td className={tdCls}>{formatINR(h.rentPaise)}</td>
                      <td className={tdCls}>
                        <StatusBadge status={h.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{children}</dd>
    </div>
  );
}

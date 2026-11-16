import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  agreementTenants,
  agreements,
  depositTxns,
  properties,
  tenants,
  units,
} from "@/db/schema";
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

const TYPE_ICON: Record<string, string> = { house: "🏠", shop: "🏪", room: "🛏️", other: "📦" };
const ID_LABELS: Record<string, string> = {
  aadhaar: "Aadhaar",
  pan: "PAN",
  driving_licence: "DL",
  voter_id: "Voter ID",
  passport: "Passport",
  other: "ID",
};

export default async function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = Number(id);
  if (!uid) notFound();

  const db = getDb();
  const rows = await db
    .select({
      id: units.id,
      label: units.label,
      type: units.type,
      status: units.status,
      areaSqft: units.areaSqft,
      expectedRentPaise: units.expectedRentPaise,
      elecMeterNo: units.elecMeterNo,
      waterMeterNo: units.waterMeterNo,
      notes: units.notes,
      propertyId: properties.id,
      propertyName: properties.name,
      propertyAddress: properties.address,
    })
    .from(units)
    .innerJoin(properties, eq(units.propertyId, properties.id))
    .where(eq(units.id, uid))
    .limit(1);
  const unit = rows[0];
  if (!unit) notFound();

  const ags = await db
    .select()
    .from(agreements)
    .where(eq(agreements.unitId, uid))
    .orderBy(desc(agreements.startDate));
  const agIds = ags.map((a) => a.id);

  const tenantRows = agIds.length
    ? await db
        .select({
          agreementId: agreementTenants.agreementId,
          name: tenants.name,
          phone: tenants.phone,
          isPrimary: agreementTenants.isPrimary,
          idType: tenants.idType,
          idNumber: tenants.idNumber,
        })
        .from(agreementTenants)
        .innerJoin(tenants, eq(agreementTenants.tenantId, tenants.id))
        .where(inArray(agreementTenants.agreementId, agIds))
    : [];

  const primaryByAg = new Map<number, { name: string; phone: string; idLabel: string }>();
  const coByAg = new Map<number, string[]>();
  for (const t of tenantRows) {
    if (t.isPrimary) {
      primaryByAg.set(t.agreementId, {
        name: t.name,
        phone: t.phone,
        idLabel: t.idNumber ? `${ID_LABELS[t.idType] ?? "ID"} ${t.idNumber}` : "",
      });
    } else {
      const arr = coByAg.get(t.agreementId) ?? [];
      arr.push(t.name);
      coByAg.set(t.agreementId, arr);
    }
  }

  const depositRows = agIds.length
    ? await db
        .select({
          agreementId: depositTxns.agreementId,
          total: sql<number>`coalesce(sum(${depositTxns.amountPaise}), 0)`,
        })
        .from(depositTxns)
        .where(and(inArray(depositTxns.agreementId, agIds), inArray(depositTxns.type, ["received", "topup"])))
        .groupBy(depositTxns.agreementId)
    : [];
  const depositsByAg = new Map(depositRows.map((d) => [d.agreementId, Number(d.total)]));

  const active = ags.find((a) => a.status === "active");
  const isOccupied = Boolean(active);

  return (
    <>
      <PageHeader
        title={`${TYPE_ICON[unit.type] ?? "📦"} ${unit.label}`}
        subtitle={`${unit.propertyName}${unit.propertyAddress ? ` · ${unit.propertyAddress}` : ""}`}
        action={
          <div className="flex gap-2">
            <Link href={`/units/${uid}/edit`} className={btnSecondary}>
              Edit unit
            </Link>
            <Link href={`/properties/${unit.propertyId}`} className={btnSecondary}>
              ← Property
            </Link>
            {!isOccupied && (
              <Link href={`/agreements/new?unitId=${uid}`} className={btnPrimary}>
                Rent out →
              </Link>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column: unit facts */}
        <div className="space-y-4">
          <Card>
            <CardHead title="Status" />
            <div className="flex items-center gap-3 p-5">
              <StatusBadge status={isOccupied ? "occupied" : unit.status} />
              <span className="text-sm text-slate-500">
                {isOccupied
                  ? "Currently rented under an active agreement"
                  : unit.status === "maintenance"
                    ? "Under maintenance — not available for rent"
                    : "Vacant — available to rent out"}
              </span>
            </div>
          </Card>

          <Card>
            <CardHead title="Unit details" />
            <dl className="space-y-2.5 p-5 text-sm">
              <Row label="Type"><span className="capitalize">{unit.type}</span></Row>
              <Row label="Area">{unit.areaSqft ? `${unit.areaSqft} sq.ft` : "—"}</Row>
              <Row label="Expected rent">{unit.expectedRentPaise ? formatINR(unit.expectedRentPaise) : "—"}</Row>
              <Row label="Electricity meter">{unit.elecMeterNo || "—"}</Row>
              <Row label="Water meter">{unit.waterMeterNo || "—"}</Row>
              {unit.notes && <Row label="Notes">{unit.notes}</Row>}
            </dl>
          </Card>
        </div>

        {/* Right column: tenant + agreements */}
        <div className="space-y-4 lg:col-span-2">
          {active && (
            <Card className="border-emerald-200 bg-emerald-50/40">
              <CardHead
                title="Current tenant"
                action={
                  <Link href={`/agreements/${active.id}`} className="text-xs font-medium text-blue-600 hover:underline">
                    Open agreement →
                  </Link>
                }
              />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div>
                  <div className="text-lg font-bold text-slate-900">
                    {primaryByAg.get(active.id)?.name ?? "—"}
                  </div>
                  <div className="mt-0.5 text-sm text-slate-500">
                    📞 {primaryByAg.get(active.id)?.phone ?? "—"}
                  </div>
                  {primaryByAg.get(active.id)?.idLabel && (
                    <div className="mt-0.5 text-xs text-slate-400">{primaryByAg.get(active.id)?.idLabel}</div>
                  )}
                  {(coByAg.get(active.id)?.length ?? 0) > 0 && (
                    <div className="mt-1 text-xs text-slate-500">
                      Co-tenants: {coByAg.get(active.id)?.join(", ")}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 text-sm">
                  <Row label="Monthly rent">
                    <span className="text-base font-bold text-emerald-700">{formatINR(active.rentPaise)}</span>
                  </Row>
                  <Row label="Agreement">{`${active.number} · ${active.type}`}</Row>
                  <Row label="Period">{`${formatDateIN(active.startDate)} → ${formatDateIN(active.endDate)}`}</Row>
                  <Row label="Rent due day">{`Day ${active.dueDay} of every month`}</Row>
                  <Row label="Advance held">
                    <span className="font-semibold">{formatINR(depositsByAg.get(active.id) ?? 0)}</span>
                  </Row>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <CardHead title={`Agreements (${ags.length})`} />
            {ags.length === 0 ? (
              <EmptyState
                title="No agreements yet"
                hint="Create a rent or lease agreement to move a tenant into this unit."
                action={
                  <Link href={`/agreements/new?unitId=${uid}`} className={`${btnPrimary} mt-3`}>
                    Create agreement
                  </Link>
                }
              />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <th className={thCls}>Number</th>
                    <th className={thCls}>Tenant(s)</th>
                    <th className={thCls}>Period</th>
                    <th className={thCls}>Rent</th>
                    <th className={thCls}>Advance</th>
                    <th className={thCls}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ags.map((a) => {
                    const cos = coByAg.get(a.id);
                    return (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className={tdCls}>
                          <Link href={`/agreements/${a.id}`} className="font-medium text-blue-600">
                            {a.number}
                          </Link>
                          <span className="ml-1 text-xs uppercase text-slate-400">{a.type}</span>
                        </td>
                        <td className={tdCls}>
                          {primaryByAg.get(a.id)?.name ?? "—"}
                          {cos && cos.length > 0 && (
                            <span className="text-xs text-slate-400"> +{cos.length}</span>
                          )}
                        </td>
                        <td className={`${tdCls} whitespace-nowrap`}>
                          {formatDateIN(a.startDate)} → {formatDateIN(a.endDate)}
                        </td>
                        <td className={tdCls}>{formatINR(a.rentPaise)}</td>
                        <td className={tdCls}>{formatINR(depositsByAg.get(a.id) ?? 0)}</td>
                        <td className={tdCls}>
                          <StatusBadge status={a.status} />
                        </td>
                      </tr>
                    );
                  })}
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

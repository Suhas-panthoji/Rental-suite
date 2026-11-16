import Link from "next/link";
import { asc, eq, inArray, notInArray } from "drizzle-orm";
import { getDb } from "@/db";
import { agreements, properties, tenants, units } from "@/db/schema";
import { fromPaise } from "@/lib/money";
import { btnSecondary, Card, CardHead, PageHeader } from "@/components/ui";
import { AgreementForm } from "./agreement-form";

export const dynamic = "force-dynamic";

export default async function NewAgreementPage({
  searchParams,
}: {
  searchParams: Promise<{ unitId?: string }>;
}) {
  const { unitId } = await searchParams;
  const preselectUnit = Number(unitId) || 0;

  const db = getDb();
  const occupiedRows = await db
    .select({ unitId: agreements.unitId })
    .from(agreements)
    .where(inArray(agreements.status, ["active", "upcoming"]));
  const occupiedIds = occupiedRows.map((o) => o.unitId);

  const baseSelect = {
    id: units.id,
    label: units.label,
    type: units.type,
    expectedRentPaise: units.expectedRentPaise,
    propertyName: properties.name,
  };
  const vacantUnits = occupiedIds.length
    ? await db
        .select(baseSelect)
        .from(units)
        .innerJoin(properties, eq(units.propertyId, properties.id))
        .where(notInArray(units.id, occupiedIds))
        .orderBy(asc(properties.name), asc(units.label))
    : await db
        .select(baseSelect)
        .from(units)
        .innerJoin(properties, eq(units.propertyId, properties.id))
        .orderBy(asc(properties.name), asc(units.label));

  const tenantRows = await db
    .select({ id: tenants.id, name: tenants.name, phone: tenants.phone })
    .from(tenants)
    .orderBy(asc(tenants.name));

  const unitOptions = vacantUnits.map((u) => ({
    id: u.id,
    label: `${u.propertyName} — ${u.label} (${u.expectedRentPaise ? `₹${fromPaise(u.expectedRentPaise)}` : "rent not set"})`,
  }));

  return (
    <>
      <PageHeader
        title="New agreement"
        subtitle="Move a tenant into a unit — rent, dates, advance"
        action={
          <div className="flex gap-2">
            <Link href="/tenants/new" className={btnSecondary}>
              + New tenant
            </Link>
            <Link href="/agreements" className={btnSecondary}>
              ← All agreements
            </Link>
          </div>
        }
      />

      {vacantUnits.length === 0 ? (
        <Card>
          <CardHead title="No vacant units" />
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Every unit is occupied or under maintenance. Add a unit under a property first, or free one up by
            terminating/expiring its agreement.
          </div>
        </Card>
      ) : (
        <AgreementForm
          unitOptions={unitOptions}
          tenants={tenantRows}
          preselectUnit={preselectUnit}
        />
      )}
    </>
  );
}

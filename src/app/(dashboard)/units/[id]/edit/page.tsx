import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { properties, units } from "@/db/schema";
import { updateUnit } from "@/app/actions/properties";
import { fromPaise } from "@/lib/money";
import {
  btnPrimary,
  btnSecondary,
  Card,
  CardHead,
  Field,
  inputCls,
  PageHeader,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function UnitEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = Number(id);
  if (!uid) notFound();

  const db = getDb();
  const rows = await db.select().from(units).where(eq(units.id, uid)).limit(1);
  const unit = rows[0];
  if (!unit) notFound();
  const propRows = await db
    .select({ name: properties.name })
    .from(properties)
    .where(eq(properties.id, unit.propertyId))
    .limit(1);

  return (
    <>
      <PageHeader
        title={`Edit unit: ${unit.label}`}
        subtitle={propRows[0]?.name ?? ""}
        action={
          <Link href={`/properties/${unit.propertyId}`} className={btnSecondary}>
            ← Back to property
          </Link>
        }
      />
      <Card className="max-w-2xl">
        <CardHead title="Unit details" />
        <form action={updateUnit} className="grid gap-4 p-5 sm:grid-cols-2">
          <input type="hidden" name="id" value={unit.id} />
          <Field label="Unit label">
            <input name="label" required defaultValue={unit.label} className={inputCls} />
          </Field>
          <Field label="Unit type">
            <select name="type" className={inputCls} defaultValue={unit.type}>
              <option value="house">House</option>
              <option value="shop">Shop</option>
              <option value="room">Room</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Area (sq.ft)">
            <input
              name="areaSqft"
              type="number"
              min="0"
              defaultValue={unit.areaSqft ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="Expected rent (₹/month)">
            <input
              name="expectedRent"
              type="number"
              min="0"
              step="0.01"
              defaultValue={unit.expectedRentPaise ? fromPaise(unit.expectedRentPaise) : ""}
              className={inputCls}
            />
          </Field>
          <Field label="Electricity meter no.">
            <input name="elecMeterNo" defaultValue={unit.elecMeterNo} className={inputCls} />
          </Field>
          <Field label="Water meter no.">
            <input name="waterMeterNo" defaultValue={unit.waterMeterNo} className={inputCls} />
          </Field>
          <Field label="Status">
            <select name="status" className={inputCls} defaultValue={unit.status}>
              <option value="vacant">Vacant</option>
              <option value="maintenance">Under maintenance</option>
            </select>
          </Field>
          <Field label="Notes">
            <input name="notes" defaultValue={unit.notes} className={inputCls} />
          </Field>
          <div className="sm:col-span-2">
            <button type="submit" className={btnPrimary}>
              Save changes
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}

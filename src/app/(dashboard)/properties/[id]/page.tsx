import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { agreements, properties, units } from "@/db/schema";
import { createUnit, updateProperty, updateUnit } from "@/app/actions/properties";
import { formatINR } from "@/lib/money";
import {
  btnPrimary,
  btnSecondary,
  Card,
  CardHead,
  Field,
  inputCls,
  PageHeader,
  StatusBadge,
  TableWrap,
  tdCls,
  thCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const pid = Number(id);
  if (!pid) notFound();

  const db = getDb();
  const propRows = await db.select().from(properties).where(eq(properties.id, pid)).limit(1);
  const property = propRows[0];
  if (!property) notFound();

  const unitRows = await db
    .select()
    .from(units)
    .where(eq(units.propertyId, pid))
    .orderBy(asc(units.label));
  const activeAgs = await db
    .select({ unitId: agreements.unitId })
    .from(agreements)
    .where(eq(agreements.status, "active"));
  const occupiedSet = new Set(activeAgs.map((a) => a.unitId));

  return (
    <>
      <PageHeader
        title={property.name}
        subtitle={`${property.type.toUpperCase()} · ${property.address || "No address set"}`}
        action={
          <Link href="/properties" className={btnSecondary}>
            ← All properties
          </Link>
        }
      />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      {property.notes && (
        <p className="mb-4 text-sm text-slate-500">📝 {property.notes}</p>
      )}

      <Card>
        <CardHead title={`Units (${unitRows.length})`} />
        {unitRows.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            No units yet — add the rentable spaces (floors, rooms, shops) below.
          </div>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th className={thCls}>Unit</th>
                <th className={thCls}>Type</th>
                <th className={thCls}>Area</th>
                <th className={thCls}>Expected rent</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {unitRows.map((u) => {
                const status = occupiedSet.has(u.id) ? "occupied" : u.status;
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className={`${tdCls} font-medium`}>{u.label}</td>
                    <td className={`${tdCls} capitalize`}>{u.type}</td>
                    <td className={tdCls}>{u.areaSqft ? `${u.areaSqft} sq.ft` : "—"}</td>
                    <td className={tdCls}>{u.expectedRentPaise ? formatINR(u.expectedRentPaise) : "—"}</td>
                    <td className={tdCls}>
                      <StatusBadge status={status} />
                    </td>
                    <td className={tdCls}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/units/${u.id}/edit`}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          Edit
                        </Link>
                        {!occupiedSet.has(u.id) && (
                          <form action={updateUnit}>
                            <input type="hidden" name="id" value={u.id} />
                            <input type="hidden" name="statusOnly" value="1" />
                            <input
                              type="hidden"
                              name="status"
                              value={u.status === "maintenance" ? "vacant" : "maintenance"}
                            />
                            <input type="hidden" name="backTo" value={`/properties/${pid}`} />
                            <button
                              type="submit"
                              className="text-xs font-medium text-amber-600 hover:underline"
                            >
                              {u.status === "maintenance" ? "Mark vacant" : "Mark maintenance"}
                            </button>
                          </form>
                        )}
                        {status === "vacant" && (
                          <Link
                            href={`/agreements/new?unitId=${u.id}`}
                            className="text-xs font-medium text-emerald-600 hover:underline"
                          >
                            Rent out →
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead title="Add a unit" />
          <form action={createUnit} className="grid gap-4 p-5 sm:grid-cols-2">
            <input type="hidden" name="propertyId" value={pid} />
            <Field label="Unit label *">
              <input name="label" required className={inputCls} placeholder="e.g. 1st Floor, Shop 2, Room 3" />
            </Field>
            <Field label="Unit type">
              <select name="type" className={inputCls} defaultValue="room">
                <option value="house">House</option>
                <option value="shop">Shop</option>
                <option value="room">Room</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Area (sq.ft)">
              <input name="areaSqft" type="number" min="0" className={inputCls} placeholder="Optional" />
            </Field>
            <Field label="Expected rent (₹/month)">
              <input name="expectedRent" type="number" min="0" step="0.01" className={inputCls} placeholder="e.g. 12000" />
            </Field>
            <Field label="Electricity meter no.">
              <input name="elecMeterNo" className={inputCls} placeholder="Optional" />
            </Field>
            <Field label="Water meter no.">
              <input name="waterMeterNo" className={inputCls} placeholder="Optional" />
            </Field>
            <div className="sm:col-span-2">
              <button type="submit" className={btnPrimary}>
                Save unit
              </button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHead title="Edit property details" />
          <form action={updateProperty} className="grid gap-4 p-5 sm:grid-cols-2">
            <input type="hidden" name="id" value={pid} />
            <Field label="Property name">
              <input name="name" required defaultValue={property.name} className={inputCls} />
            </Field>
            <Field label="Type">
              <select name="type" className={inputCls} defaultValue={property.type}>
                <option value="house">House</option>
                <option value="shop">Shop</option>
                <option value="building">Building</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Address">
              <input name="address" defaultValue={property.address} className={inputCls} />
            </Field>
            <Field label="Notes">
              <input name="notes" defaultValue={property.notes} className={inputCls} />
            </Field>
            <div className="sm:col-span-2">
              <button type="submit" className={btnSecondary}>
                Update property
              </button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}

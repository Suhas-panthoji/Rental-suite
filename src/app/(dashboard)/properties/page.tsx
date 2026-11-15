import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { agreements, properties, units } from "@/db/schema";
import { createProperty } from "@/app/actions/properties";
import { formatINR } from "@/lib/money";
import {
  btnPrimary,
  Card,
  CardHead,
  EmptyState,
  Field,
  inputCls,
  PageHeader,
  TableWrap,
  tdCls,
  thCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const db = getDb();
  const props = await db.select().from(properties).orderBy(asc(properties.name));
  const unitRows = await db
    .select({ id: units.id, propertyId: units.propertyId, status: units.status })
    .from(units);
  const activeAgs = await db
    .select({ unitId: agreements.unitId })
    .from(agreements)
    .where(eq(agreements.status, "active"));
  const occupiedSet = new Set(activeAgs.map((a) => a.unitId));

  const counts = new Map<number, { total: number; occupied: number; vacant: number }>();
  for (const u of unitRows) {
    const c = counts.get(u.propertyId) ?? { total: 0, occupied: 0, vacant: 0 };
    c.total++;
    if (occupiedSet.has(u.id)) c.occupied++;
    else if (u.status === "vacant") c.vacant++;
    counts.set(u.propertyId, c);
  }

  return (
    <>
      <PageHeader
        title="Properties"
        subtitle="Houses, shops and buildings — each holding rentable units"
      />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      <Card>
        <CardHead title={`All properties (${props.length})`} />
        {props.length === 0 ? (
          <EmptyState
            title="No properties yet"
            hint="Start by adding your first property — a house, shop or building. Then add its rentable units (floors, rooms, shops)."
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th className={thCls}>Name</th>
                <th className={thCls}>Type</th>
                <th className={thCls}>Address</th>
                <th className={thCls}>Units</th>
                <th className={thCls}>Occupied</th>
                <th className={thCls}>Vacant</th>
              </tr>
            </thead>
            <tbody>
              {props.map((p) => {
                const c = counts.get(p.id) ?? { total: 0, occupied: 0, vacant: 0 };
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className={tdCls}>
                      <Link href={`/properties/${p.id}`} className="font-medium text-blue-600">
                        {p.name}
                      </Link>
                    </td>
                    <td className={`${tdCls} capitalize`}>{p.type}</td>
                    <td className={`${tdCls} max-w-xs truncate text-slate-500`}>{p.address}</td>
                    <td className={tdCls}>{c.total}</td>
                    <td className={`${tdCls} text-emerald-600`}>{c.occupied}</td>
                    <td className={tdCls}>{c.vacant}</td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      <Card className="mt-4">
        <CardHead title="Add a property" />
        <form action={createProperty} className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Property name *">
            <input name="name" required className={inputCls} placeholder="e.g. Green Villa, MG Road" />
          </Field>
          <Field label="Type">
            <select name="type" className={inputCls} defaultValue="house">
              <option value="house">House</option>
              <option value="shop">Shop</option>
              <option value="building">Building</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Address">
            <input name="address" className={inputCls} placeholder="Street, city, PIN" />
          </Field>
          <Field label="Notes">
            <input name="notes" className={inputCls} placeholder="Optional" />
          </Field>
          <div className="sm:col-span-2">
            <button type="submit" className={btnPrimary}>
              Save property
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}

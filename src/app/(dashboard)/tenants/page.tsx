import Link from "next/link";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { agreementTenants, agreements, tenants } from "@/db/schema";
import { btnPrimary, Card, CardHead, EmptyState, PageHeader, StatusBadge, TableWrap, tdCls, thCls } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const db = getDb();
  const search = (q ?? "").trim();

  const rows = await db
    .select()
    .from(tenants)
    .where(
      search
        ? or(sql`${tenants.name} LIKE ${"%" + search + "%"}`, sql`${tenants.phone} LIKE ${"%" + search + "%"}`)
        : undefined
    )
    .orderBy(asc(tenants.name))
    .limit(200);

  const tenantIds = rows.map((r) => r.id);
  const activeLinks = tenantIds.length
    ? await db
        .select({ tenantId: agreementTenants.tenantId })
        .from(agreementTenants)
        .innerJoin(agreements, eq(agreementTenants.agreementId, agreements.id))
        .where(and(inArray(agreementTenants.tenantId, tenantIds), eq(agreements.status, "active")))
    : [];
  const activeSet = new Set(activeLinks.map((l) => l.tenantId));

  return (
    <>
      <PageHeader
        title="Tenants"
        subtitle="People and businesses renting your units"
        action={
          <Link href="/tenants/new" className={btnPrimary}>
            + Add tenant
          </Link>
        }
      />

      <Card>
        <CardHead
          title={`All tenants (${rows.length})`}
          action={
            <form className="flex gap-2">
              <input
                name="q"
                defaultValue={search}
                placeholder="Search name or phone…"
                className="w-44 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500"
              />
              <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                Search
              </button>
            </form>
          }
        />
        {rows.length === 0 ? (
          <EmptyState
            title={search ? "No matching tenants" : "No tenants yet"}
            hint={
              search
                ? "Try a different name or phone number."
                : "Add tenants here first, then create their rent or lease agreements."
            }
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th className={thCls}>Name</th>
                <th className={thCls}>Phone</th>
                <th className={thCls}>ID</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className={tdCls}>
                    <Link href={`/tenants/${t.id}`} className="font-medium text-blue-600">
                      {t.name}
                    </Link>
                  </td>
                  <td className={tdCls}>{t.phone}</td>
                  <td className={`${tdCls} text-slate-500`}>
                    {t.idNumber ? `${idTypeLabel(t.idType)} ${t.idNumber}` : "—"}
                  </td>
                  <td className={tdCls}>
                    <StatusBadge status={activeSet.has(t.id) ? "active" : "vacant"} />
                  </td>
                  <td className={tdCls}>
                    <Link href={`/tenants/${t.id}/edit`} className="text-xs font-medium text-blue-600 hover:underline">
                      Edit
                    </Link>
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

function idTypeLabel(v: string): string {
  const map: Record<string, string> = {
    aadhaar: "Aadhaar",
    pan: "PAN",
    driving_licence: "DL",
    voter_id: "Voter ID",
    passport: "Passport",
    other: "ID",
  };
  return map[v] ?? "ID";
}

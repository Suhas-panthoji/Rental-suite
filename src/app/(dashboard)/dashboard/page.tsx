import Link from "next/link";
import { runDailyMaintenance } from "@/lib/dues";
import { getDashboardData, getUnitsOverview, primaryTenantNames } from "@/lib/queries";
import { formatINR } from "@/lib/money";
import { formatDateIN } from "@/lib/dates";
import {
  btnPrimary,
  btnSecondary,
  Card,
  CardHead,
  EmptyState,
  PageHeader,
  StatCard,
  StatusBadge,
  TableWrap,
  tdCls,
  thCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const UNIT_ICON: Record<string, string> = {
  house: "🏠",
  shop: "🏪",
  room: "🛏️",
  other: "📦",
};

function periodShort(period: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [, m] = period.split("-").map(Number);
  return months[m - 1] ?? period;
}

export default async function DashboardPage() {
  await runDailyMaintenance();
  const [d, unitRows] = await Promise.all([getDashboardData(), getUnitsOverview()]);
  const expiryNames = await primaryTenantNames(d.expiries.map((e) => e.id));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Your units at a glance — click any unit to see its full story"
        action={
          <div className="flex gap-2">
            <Link href="/properties" className={btnSecondary}>
              🏢 Properties
            </Link>
            <Link href="/payments/new" className={btnPrimary}>
              💵 Record payment
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total units" value={String(d.totalUnits)} sub={`${d.vacantUnits} vacant`} href="/properties" />
        <StatCard label="Occupied" value={String(d.occupiedUnits)} tone="green" href="/agreements" />
        <StatCard label={`Rent due (${periodShort(d.period)})`} value={formatINR(d.dueThisMonth)} href="/dues" />
        <StatCard label={`Collected (${periodShort(d.period)})`} value={formatINR(d.collectedThisMonth)} tone="green" href="/payments" />
        <StatCard label="Overdue" value={formatINR(d.overdueTotal)} tone={d.overdueTotal > 0 ? "red" : "slate"} href="/dues" />
        <StatCard label="Advances held" value={formatINR(d.advancesHeld)} sub="Refundable" href="/agreements" />
      </div>

      {/* ---- Units grid ---- */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">All units</h2>
          <Link href="/properties" className="text-xs font-medium text-blue-600 hover:underline">
            Manage properties →
          </Link>
        </div>
        {unitRows.length === 0 ? (
          <Card>
            <EmptyState
              title="No units yet"
              hint="Add a property first (a house, shop or building), then add its rentable units — they will appear here as cards."
              action={
                <Link href="/properties" className={`${btnPrimary} mt-3`}>
                  🏢 Add your first property
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {unitRows.map((u) => (
              <Link
                key={u.id}
                href={`/units/${u.id}`}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{UNIT_ICON[u.type] ?? "📦"}</span>
                  <StatusBadge status={u.occupied ? "occupied" : u.status} />
                </div>
                <div className="mt-3 font-semibold text-slate-900 group-hover:text-blue-700">{u.label}</div>
                <div className="text-xs text-slate-500">{u.propertyName}</div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                  <span className={u.tenantName ? "font-medium text-slate-700" : "text-slate-400"}>
                    {u.tenantName ?? "Vacant"}
                  </span>
                  <span className="font-semibold text-slate-900">{formatINR(u.rentPaise)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ---- Lists ---- */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead title="Upcoming expiries (90 days)" action={<Link href="/agreements" className="text-xs text-blue-600">View all</Link>} />
          {d.expiries.length === 0 ? (
            <EmptyState title="No upcoming expiries" hint="Agreements ending in the next 90 days appear here." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th className={thCls}>Agreement</th>
                  <th className={thCls}>Tenant</th>
                  <th className={thCls}>Ends on</th>
                </tr>
              </thead>
              <tbody>
                {d.expiries.map((e) => (
                  <tr key={e.id}>
                    <td className={tdCls}>
                      <Link href={`/agreements/${e.id}`} className="font-medium text-blue-600">{e.number}</Link>
                      <span className="ml-1 text-xs text-slate-400">{e.unitLabel}</span>
                    </td>
                    <td className={tdCls}>{expiryNames[e.id] ?? "—"}</td>
                    <td className={tdCls}>{formatDateIN(e.endDate)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>

        <Card>
          <CardHead title="Top arrears" action={<Link href="/dues" className="text-xs text-blue-600">View dues</Link>} />
          {d.topArrears.length === 0 ? (
            <EmptyState title="No arrears 🎉" hint="Every tenant is fully settled." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th className={thCls}>Tenant</th>
                  <th className={thCls}>Unit</th>
                  <th className={thCls + " text-right"}>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {d.topArrears.map((a) => (
                  <tr key={a.agreementId}>
                    <td className={tdCls}>{a.tenantName}</td>
                    <td className={`${tdCls} text-slate-500`}>{a.unitLabel}</td>
                    <td className={`${tdCls} text-right font-semibold text-red-600`}>{formatINR(a.total)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHead title="Recent payments" action={<Link href="/payments" className="text-xs text-blue-600">View all</Link>} />
        {d.recentPayments.length === 0 ? (
          <EmptyState title="No payments recorded yet" hint="Record your first rent payment to see it here." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th className={thCls}>Receipt</th>
                <th className={thCls}>Date</th>
                <th className={thCls}>Tenant</th>
                <th className={thCls}>Unit</th>
                <th className={thCls}>Mode</th>
                <th className={thCls + " text-right"}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {d.recentPayments.map((p) => (
                <tr key={p.id}>
                  <td className={tdCls}>{p.receiptNo}</td>
                  <td className={tdCls}>{formatDateIN(p.date)}</td>
                  <td className={tdCls}>{p.tenantName}</td>
                  <td className={`${tdCls} text-slate-500`}>{p.unitLabel}</td>
                  <td className={`${tdCls} uppercase`}>{p.mode}</td>
                  <td className={`${tdCls} text-right font-semibold text-emerald-600`}>{formatINR(p.amountPaise)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
}

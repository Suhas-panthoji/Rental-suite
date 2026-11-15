import Link from "next/link";
import { runDailyMaintenance } from "@/lib/dues";
import { getDashboardData, primaryTenantNames } from "@/lib/queries";
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
  TableWrap,
  tdCls,
  thCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await runDailyMaintenance();
  const d = await getDashboardData();
  const expiryNames = await primaryTenantNames(d.expiries.map((e) => e.id));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your properties, rents and collections"
        action={
          <div className="flex gap-2">
            <Link href="/properties" className={btnSecondary}>
              🏢 Add property
            </Link>
            <Link href="/payments/new" className={btnPrimary}>
              💵 Record payment
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Total units" value={String(d.totalUnits)} sub={`${d.vacantUnits} vacant · ${d.maintenanceUnits} maintenance`} href="/properties" />
        <StatCard label="Occupied units" value={String(d.occupiedUnits)} tone="green" href="/agreements" />
        <StatCard label={`Rent due (${formatPeriod(d.period)})`} value={formatINR(d.dueThisMonth)} href="/dues" />
        <StatCard label={`Collected (${formatPeriod(d.period)})`} value={formatINR(d.collectedThisMonth)} tone="green" href="/payments" />
        <StatCard label="Overdue total" value={formatINR(d.overdueTotal)} tone={d.overdueTotal > 0 ? "red" : "slate"} sub={d.overdueTotal > 0 ? "Needs follow-up" : "All clear"} href="/dues" />
        <StatCard label="Advances held" value={formatINR(d.advancesHeld)} sub="Refundable to tenants" href="/agreements" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead title="Upcoming lease / agreement expiries (90 days)" action={<Link href="/agreements" className="text-xs text-blue-600">View all</Link>} />
          {d.expiries.length === 0 ? (
            <EmptyState title="No upcoming expiries" hint="Active agreements ending in the next 90 days will appear here." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th className={thCls}>Agreement</th>
                  <th className={thCls}>Tenant</th>
                  <th className={thCls}>Unit</th>
                  <th className={thCls}>Ends on</th>
                </tr>
              </thead>
              <tbody>
                {d.expiries.map((e) => (
                  <tr key={e.id}>
                    <td className={tdCls}>
                      <Link href={`/agreements/${e.id}`} className="font-medium text-blue-600">{e.number}</Link>
                    </td>
                    <td className={tdCls}>{expiryNames[e.id] ?? "—"}</td>
                    <td className={tdCls}>{e.unitLabel}<span className="text-xs text-slate-400"> · {e.propertyName}</span></td>
                    <td className={tdCls}>{formatDateIN(e.endDate)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>

        <Card>
          <CardHead title="Top arrears (tenants owing money)" action={<Link href="/dues" className="text-xs text-blue-600">View dues</Link>} />
          {d.topArrears.length === 0 ? (
            <EmptyState title="No arrears 🎉" hint="Every tenant is fully settled." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th className={thCls}>Tenant</th>
                  <th className={thCls}>Unit</th>
                  <th className={thCls}>Agreement</th>
                  <th className={thCls}>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {d.topArrears.map((a) => (
                  <tr key={a.agreementId}>
                    <td className={tdCls}>{a.tenantName}</td>
                    <td className={tdCls}>{a.unitLabel}<span className="text-xs text-slate-400"> · {a.propertyName}</span></td>
                    <td className={tdCls}>
                      <Link href={`/agreements/${a.agreementId}`} className="text-blue-600">{a.number}</Link>
                    </td>
                    <td className={`${tdCls} font-semibold text-red-600`}>{formatINR(a.total)}</td>
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
                  <td className={tdCls}>{p.unitLabel}<span className="text-xs text-slate-400"> · {p.propertyName}</span></td>
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

function formatPeriod(period: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [, m] = period.split("-").map(Number);
  return months[m - 1] ?? period;
}

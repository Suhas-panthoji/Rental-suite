import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  agreementTenants,
  agreements,
  depositTxns,
  dues,
  payments,
  properties,
  tenants,
  units,
} from "@/db/schema";
import { formatINR } from "@/lib/money";
import { formatDateIN, todayISO } from "@/lib/dates";
import { addDaysISO } from "@/lib/dates";
import { renewAgreement, terminateAgreement } from "@/app/actions/agreements";
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

export default async function AgreementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const aid = Number(id);
  if (!aid) notFound();

  const db = getDb();
  const rows = await db
    .select({
      agreement: agreements,
      unitLabel: units.label,
      unitId: units.id,
      propertyName: properties.name,
      propertyId: properties.id,
    })
    .from(agreements)
    .innerJoin(units, eq(agreements.unitId, units.id))
    .innerJoin(properties, eq(units.propertyId, properties.id))
    .where(eq(agreements.id, aid))
    .limit(1);
  const row = rows[0];
  if (!row) notFound();
  const a = row.agreement;
  const isActive = a.status === "active" || a.status === "upcoming";

  const tenantRows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      phone: tenants.phone,
      idNumber: tenants.idNumber,
      idType: tenants.idType,
      isPrimary: agreementTenants.isPrimary,
    })
    .from(agreementTenants)
    .innerJoin(tenants, eq(agreementTenants.tenantId, tenants.id))
    .where(eq(agreementTenants.agreementId, aid))
    .orderBy(desc(agreementTenants.isPrimary));

  const deposits = await db
    .select()
    .from(depositTxns)
    .where(eq(depositTxns.agreementId, aid))
    .orderBy(asc(depositTxns.date), asc(depositTxns.id));
  const advanceHeld = deposits
    .filter((d) => d.type === "received" || d.type === "topup")
    .reduce((s, d) => s + d.amountPaise, 0);

  const dueRows = await db
    .select()
    .from(dues)
    .where(eq(dues.agreementId, aid))
    .orderBy(desc(dues.dueDate))
    .limit(50);
  const outstanding = dueRows.reduce((s, d) => s + d.balancePaise, 0);

  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.agreementId, aid))
    .orderBy(desc(payments.date))
    .limit(50);

  const nextExpirySuggestion = addDaysISO(a.endDate, 365);

  return (
    <>
      <PageHeader
        title={a.number}
        subtitle={`${a.type === "lease" ? "Lease" : "Monthly rent"} · ${row.unitLabel} · ${row.propertyName}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/agreements" className={btnSecondary}>
              ← All agreements
            </Link>
            <Link href={`/units/${row.unitId}`} className={btnSecondary}>
              Unit
            </Link>
            {isActive && (
              <Link href={`/payments/new?agreementId=${a.id}`} className={btnPrimary}>
                💵 Record payment
              </Link>
            )}
          </div>
        }
      />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: facts */}
        <div className="space-y-4">
          <Card>
            <CardHead title="Overview" />
            <dl className="space-y-2.5 p-5 text-sm">
              <Row label="Status"><StatusBadge status={a.status} /></Row>
              <Row label="Type"><span className="capitalize">{a.type}</span></Row>
              <Row label="Monthly rent"><span className="font-bold text-slate-900">{formatINR(a.rentPaise)}</span></Row>
              <Row label="Period">{`${formatDateIN(a.startDate)} → ${formatDateIN(a.endDate)}`}</Row>
              <Row label="Rent due day">{`Day ${a.dueDay}`}</Row>
              <Row label="Notice period">{`${a.noticeDays} days`}</Row>
              {a.escalationPct > 0 && <Row label="Escalation">{`${a.escalationPct}% per year`}</Row>}
              <Row label="Advance held"><span className="font-semibold">{formatINR(advanceHeld)}</span></Row>
              <Row label="Outstanding dues">
                <span className={outstanding > 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>
                  {formatINR(outstanding)}
                </span>
              </Row>
              {a.terminatedOn && <Row label="Terminated on">{formatDateIN(a.terminatedOn)}</Row>}
              {a.supersededById && (
                <Row label="Renewed as">
                  <Link href={`/agreements/${a.supersededById}`} className="text-blue-600">
                    View successor →
                  </Link>
                </Row>
              )}
            </dl>
            {a.terms && (
              <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">📝 {a.terms}</div>
            )}
          </Card>

          {isActive && (
            <Card>
              <CardHead title="Actions" />
              <div className="space-y-3 p-5">
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">🔄 Renew agreement</summary>
                  <form action={renewAgreement} className="mt-3 space-y-3">
                    <input type="hidden" name="id" value={a.id} />
                    <Field label="New end date *" hint={`Renewal starts ${formatDateIN(addDaysISO(a.endDate, 1))}`}>
                      <input
                        name="newEndDate"
                        required
                        type="date"
                        min={addDaysISO(a.endDate, 1)}
                        defaultValue={nextExpirySuggestion > a.endDate ? nextExpirySuggestion : a.endDate}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Revised monthly rent (₹)" hint={`Leave empty to keep ${formatINR(a.rentPaise)}`}>
                      <input name="newRent" type="number" min="0" step="0.01" className={inputCls} />
                    </Field>
                    <Field label="Additional advance (₹)">
                      <input name="additionalAdvance" type="number" min="0" step="0.01" defaultValue={0} className={inputCls} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Mode">
                        <select name="mode" className={inputCls} defaultValue="cash">
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="bank">Bank transfer</option>
                          <option value="cheque">Cheque</option>
                          <option value="other">Other</option>
                        </select>
                      </Field>
                      <Field label="Reference">
                        <input name="reference" className={inputCls} />
                      </Field>
                    </div>
                    <button type="submit" className={btnPrimary}>
                      Create renewal
                    </button>
                  </form>
                </details>

                <details>
                  <summary className="cursor-pointer text-sm font-medium text-red-600">⚠️ Terminate early</summary>
                  <form action={terminateAgreement} className="mt-3 space-y-3">
                    <input type="hidden" name="id" value={a.id} />
                    <Field label="Termination date *">
                      <input name="terminatedOn" required type="date" defaultValue={todayISO()} className={inputCls} />
                    </Field>
                    <Field label="Reason">
                      <input name="reason" className={inputCls} placeholder="e.g. Tenant relocating" />
                    </Field>
                    <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
                      Terminate agreement
                    </button>
                  </form>
                </details>
              </div>
            </Card>
          )}
        </div>

        {/* Right: tenants, ledger, dues, payments */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHead title={`Tenants (${tenantRows.length})`} />
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {tenantRows.map((t) => (
                <Link
                  key={t.id}
                  href={`/tenants/${t.id}`}
                  className="rounded-lg border border-slate-200 p-3 transition-colors hover:border-blue-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{t.name}</span>
                    {t.isPrimary && <span className="text-xs font-medium text-blue-600">Primary</span>}
                  </div>
                  <div className="mt-0.5 text-sm text-slate-500">📞 {t.phone}</div>
                  {t.idNumber && (
                    <div className="text-xs text-slate-400">{t.idNumber}</div>
                  )}
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardHead title={`Advance ledger (${formatINR(advanceHeld)} held)`} />
            {deposits.length === 0 ? (
              <div className="px-5 py-6 text-sm text-slate-500">No advance recorded for this agreement.</div>
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <th className={thCls}>Date</th>
                    <th className={thCls}>Type</th>
                    <th className={thCls}>Mode</th>
                    <th className={thCls}>Reference</th>
                    <th className={thCls + " text-right"}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((d) => (
                    <tr key={d.id}>
                      <td className={tdCls}>{formatDateIN(d.date)}</td>
                      <td className={`${tdCls} capitalize`}>{d.type}</td>
                      <td className={`${tdCls} uppercase`}>{d.mode}</td>
                      <td className={tdCls}>{d.reference || d.reason || "—"}</td>
                      <td className={`${tdCls} text-right font-medium`}>{formatINR(d.amountPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </Card>

          <Card>
            <CardHead
              title={`Dues (${dueRows.length})`}
              action={<Link href="/dues" className="text-xs text-blue-600">All dues</Link>}
            />
            {dueRows.length === 0 ? (
              <div className="px-5 py-6 text-sm text-slate-500">
                No dues yet — rent dues generate automatically on the due day each month.
              </div>
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <th className={thCls}>Type</th>
                    <th className={thCls}>Period</th>
                    <th className={thCls}>Due date</th>
                    <th className={thCls}>Amount</th>
                    <th className={thCls}>Balance</th>
                    <th className={thCls}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dueRows.map((d) => (
                    <tr key={d.id}>
                      <td className={`${tdCls} capitalize`}>{d.type}</td>
                      <td className={tdCls}>{d.period || "—"}</td>
                      <td className={tdCls}>{formatDateIN(d.dueDate)}</td>
                      <td className={tdCls}>{formatINR(d.amountPaise)}</td>
                      <td className={`${tdCls} font-medium`}>{formatINR(d.balancePaise)}</td>
                      <td className={tdCls}><StatusBadge status={d.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </Card>

          <Card>
            <CardHead
              title={`Payments (${paymentRows.length})`}
              action={<Link href="/payments" className="text-xs text-blue-600">All payments</Link>}
            />
            {paymentRows.length === 0 ? (
              <div className="px-5 py-6 text-sm text-slate-500">No payments recorded yet.</div>
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <th className={thCls}>Receipt</th>
                    <th className={thCls}>Date</th>
                    <th className={thCls}>Mode</th>
                    <th className={thCls}>Reference</th>
                    <th className={thCls + " text-right"}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRows.map((p) => (
                    <tr key={p.id}>
                      <td className={tdCls}>{p.receiptNo}</td>
                      <td className={tdCls}>{formatDateIN(p.date)}</td>
                      <td className={`${tdCls} uppercase`}>{p.mode}</td>
                      <td className={tdCls}>{p.reference || "—"}</td>
                      <td className={`${tdCls} text-right font-semibold text-emerald-600`}>
                        {formatINR(p.amountPaise)}
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

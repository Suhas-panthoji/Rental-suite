"use client";

import { useActionState } from "react";
import { createAgreementAction, type FormState } from "@/app/actions/agreements";
import { Card, CardHead, Field, inputCls, btnPrimary } from "@/components/ui";

type UnitOption = { id: number; label: string };
type TenantOption = { id: number; name: string; phone: string };

export function AgreementForm({
  unitOptions,
  tenants,
  preselectUnit,
}: {
  unitOptions: UnitOption[];
  tenants: TenantOption[];
  preselectUnit: number;
}) {
  const [state, formAction, pending] = useActionState(createAgreementAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardHead title="Unit & tenants" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Unit *">
            <select name="unitId" required defaultValue={preselectUnit || ""} className={inputCls}>
              <option value="" disabled>
                Select a vacant unit…
              </option>
              {unitOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Agreement type *">
            <select name="type" required className={inputCls} defaultValue="rent">
              <option value="rent">Monthly rent</option>
              <option value="lease">Lease</option>
            </select>
          </Field>
          <Field label="Primary tenant *" hint="The main contact for this tenancy">
            <select name="tenantIds" required className={inputCls} defaultValue="">
              <option value="" disabled>
                Select tenant…
              </option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.phone})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Co-tenants" hint="Hold Ctrl/Cmd to select multiple (family members, partners)">
            <select name="tenantIds" multiple size={3} className={`${inputCls} h-auto`}>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHead title="Rent & dates" />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Field label="Monthly rent (₹) *">
            <input name="rent" required type="number" min="0" step="0.01" className={inputCls} placeholder="e.g. 12000" />
          </Field>
          <Field label="Start date *">
            <input name="startDate" required type="date" className={inputCls} />
          </Field>
          <Field label="End date *">
            <input name="endDate" required type="date" className={inputCls} />
          </Field>
          <Field label="Rent due day" hint="Day of month the rent is due (1–28)">
            <input name="dueDay" type="number" min="1" max="28" defaultValue={5} className={inputCls} />
          </Field>
          <Field label="Notice period (days)">
            <input name="noticeDays" type="number" min="0" max="365" defaultValue={30} className={inputCls} />
          </Field>
          <Field label="Yearly escalation (%)" hint="Optional rent increase per completed year">
            <input name="escalationPct" type="number" min="0" max="50" defaultValue={0} className={inputCls} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHead title="Advance (deposit)" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Advance amount (₹)" hint="Refundable deposit — leave 0 if none">
            <input name="advance" type="number" min="0" step="0.01" defaultValue={0} className={inputCls} />
          </Field>
          <Field label="Received on">
            <input name="advanceDate" type="date" className={inputCls} />
          </Field>
          <Field label="Mode">
            <select name="advanceMode" className={inputCls} defaultValue="cash">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank transfer</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Reference">
            <input name="advanceReference" className={inputCls} placeholder="UPI txn ID / cheque no." />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Terms / notes">
              <textarea name="terms" rows={3} className={inputCls} placeholder="Special conditions, notice terms…" />
            </Field>
          </div>
        </div>
      </Card>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Creating…" : "Create agreement"}
      </button>
    </form>
  );
}

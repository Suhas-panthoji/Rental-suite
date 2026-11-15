import Link from "next/link";
import { createTenant } from "@/app/actions/tenants";
import { btnPrimary, btnSecondary, Card, CardHead, Field, inputCls, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <>
      <PageHeader
        title="Add tenant"
        action={
          <Link href="/tenants" className={btnSecondary}>
            ← All tenants
          </Link>
        }
      />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      <Card className="max-w-2xl">
        <CardHead title="Tenant details" />
        <form action={createTenant} className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Full name *">
            <input name="name" required className={inputCls} placeholder="e.g. Ravi Kumar" />
          </Field>
          <Field label="Phone *">
            <input name="phone" required className={inputCls} placeholder="e.g. 9876543210" />
          </Field>
          <Field label="Alternate phone">
            <input name="altPhone" className={inputCls} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" className={inputCls} />
          </Field>
          <Field label="Permanent address">
            <input name="address" className={inputCls} placeholder="Native place / permanent address" />
          </Field>
          <Field label="Occupation">
            <input name="occupation" className={inputCls} placeholder="e.g. Shopkeeper, Software engineer" />
          </Field>
          <Field label="ID type">
            <select name="idType" className={inputCls} defaultValue="aadhaar">
              <option value="aadhaar">Aadhaar</option>
              <option value="pan">PAN</option>
              <option value="driving_licence">Driving Licence</option>
              <option value="voter_id">Voter ID</option>
              <option value="passport">Passport</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="ID number">
            <input name="idNumber" className={inputCls} placeholder="KYC reference" />
          </Field>
          <Field label="Emergency contact">
            <input name="emergencyContact" className={inputCls} placeholder="Name & phone" />
          </Field>
          <Field label="Notes">
            <input name="notes" className={inputCls} placeholder="Optional" />
          </Field>
          <div className="sm:col-span-2">
            <button type="submit" className={btnPrimary}>
              Save tenant
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}

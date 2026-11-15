import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { tenants } from "@/db/schema";
import { updateTenant } from "@/app/actions/tenants";
import { btnPrimary, btnSecondary, Card, CardHead, Field, inputCls, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TenantEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const tid = Number(id);
  if (!tid) notFound();

  const rows = await getDb().select().from(tenants).where(eq(tenants.id, tid)).limit(1);
  const tenant = rows[0];
  if (!tenant) notFound();

  return (
    <>
      <PageHeader
        title={`Edit tenant: ${tenant.name}`}
        action={
          <Link href={`/tenants/${tid}`} className={btnSecondary}>
            ← Back
          </Link>
        }
      />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      <Card className="max-w-2xl">
        <CardHead title="Tenant details" />
        <form action={updateTenant} className="grid gap-4 p-5 sm:grid-cols-2">
          <input type="hidden" name="id" value={tid} />
          <Field label="Full name *">
            <input name="name" required defaultValue={tenant.name} className={inputCls} />
          </Field>
          <Field label="Phone *">
            <input name="phone" required defaultValue={tenant.phone} className={inputCls} />
          </Field>
          <Field label="Alternate phone">
            <input name="altPhone" defaultValue={tenant.altPhone} className={inputCls} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" defaultValue={tenant.email} className={inputCls} />
          </Field>
          <Field label="Permanent address">
            <input name="address" defaultValue={tenant.address} className={inputCls} />
          </Field>
          <Field label="Occupation">
            <input name="occupation" defaultValue={tenant.occupation} className={inputCls} />
          </Field>
          <Field label="ID type">
            <select name="idType" className={inputCls} defaultValue={tenant.idType}>
              <option value="aadhaar">Aadhaar</option>
              <option value="pan">PAN</option>
              <option value="driving_licence">Driving Licence</option>
              <option value="voter_id">Voter ID</option>
              <option value="passport">Passport</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="ID number">
            <input name="idNumber" defaultValue={tenant.idNumber} className={inputCls} />
          </Field>
          <Field label="Emergency contact">
            <input name="emergencyContact" defaultValue={tenant.emergencyContact} className={inputCls} />
          </Field>
          <Field label="Notes">
            <input name="notes" defaultValue={tenant.notes} className={inputCls} />
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

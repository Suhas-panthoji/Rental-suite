"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { tenants } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const tenantSchema = z.object({
  name: z.string().trim().min(1, "Tenant name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  altPhone: z.string().trim().default(""),
  email: z.string().trim().default(""),
  address: z.string().trim().default(""),
  idType: z.enum(["aadhaar", "pan", "driving_licence", "voter_id", "passport", "other"]).default("aadhaar"),
  idNumber: z.string().trim().default(""),
  occupation: z.string().trim().default(""),
  emergencyContact: z.string().trim().default(""),
  notes: z.string().trim().default(""),
});

export async function createTenant(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = tenantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/tenants/new?error=Name+and+phone+are+required");

  const [row] = await getDb().insert(tenants).values(parsed.data).returning({ id: tenants.id });
  await logAudit({ entity: "tenant", entityId: row.id, action: "create", after: parsed.data, userId: user.id });
  revalidatePath("/tenants");
  redirect(`/tenants/${row.id}`);
}

export async function updateTenant(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const parsed = tenantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !id) redirect(`/tenants/${id}?error=Name+and+phone+are+required`);

  const before = await getDb().select().from(tenants).where(eq(tenants.id, id)).limit(1);
  await getDb().update(tenants).set(parsed.data).where(eq(tenants.id, id));
  await logAudit({ entity: "tenant", entityId: id, action: "update", before: before[0], after: parsed.data, userId: user.id });
  revalidatePath(`/tenants/${id}`);
  revalidatePath("/tenants");
  redirect(`/tenants/${id}`);
}

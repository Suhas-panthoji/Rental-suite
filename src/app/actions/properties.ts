"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { properties, units } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { toPaise } from "@/lib/money";

const propertySchema = z.object({
  name: z.string().trim().min(1, "Property name is required"),
  type: z.enum(["house", "shop", "building", "other"]),
  address: z.string().trim().default(""),
  notes: z.string().trim().default(""),
});

export async function createProperty(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = propertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/properties?error=Please+enter+a+property+name");

  const [row] = await getDb()
    .insert(properties)
    .values(parsed.data)
    .returning({ id: properties.id });
  await logAudit({ entity: "property", entityId: row.id, action: "create", after: parsed.data, userId: user.id });
  revalidatePath("/properties");
  redirect(`/properties/${row.id}`);
}

export async function updateProperty(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const parsed = propertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !id) redirect(`/properties/${id}?error=Please+check+the+form`);

  const before = await getDb().select().from(properties).where(eq(properties.id, id)).limit(1);
  await getDb().update(properties).set(parsed.data).where(eq(properties.id, id));
  await logAudit({ entity: "property", entityId: id, action: "update", before: before[0], after: parsed.data, userId: user.id });
  revalidatePath(`/properties/${id}`);
  revalidatePath("/properties");
  redirect(`/properties/${id}`);
}

const unitSchema = z.object({
  propertyId: z.coerce.number().int().positive(),
  label: z.string().trim().min(1, "Unit label is required"),
  type: z.enum(["house", "shop", "room", "other"]),
  elecMeterNo: z.string().trim().default(""),
  waterMeterNo: z.string().trim().default(""),
  notes: z.string().trim().default(""),
});

export async function createUnit(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = unitSchema.safeParse(Object.fromEntries(formData));
  const propertyId = Number(formData.get("propertyId"));
  if (!parsed.success) redirect(`/properties/${propertyId}?error=Please+enter+a+unit+label`);

  const areaRaw = String(formData.get("areaSqft") ?? "").trim();
  const rentRaw = String(formData.get("expectedRent") ?? "0");
  const [row] = await getDb()
    .insert(units)
    .values({
      ...parsed.data,
      areaSqft: areaRaw && !Number.isNaN(Number(areaRaw)) ? Number(areaRaw) : null,
      expectedRentPaise: toPaise(rentRaw || "0"),
    })
    .returning({ id: units.id });
  await logAudit({ entity: "unit", entityId: row.id, action: "create", after: parsed.data, userId: user.id });
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/properties");
  redirect(`/properties/${propertyId}`);
}

export async function updateUnit(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const backTo = String(formData.get("backTo") || "/properties");
  if (!id) redirect(backTo);

  const before = await getDb().select().from(units).where(eq(units.id, id)).limit(1);
  if (before.length === 0) redirect(backTo);
  const prev = before[0];

  // Quick action: only status provided
  const statusOnly = formData.get("statusOnly");
  if (statusOnly === "1") {
    const status = String(formData.get("status")) === "maintenance" ? "maintenance" : "vacant";
    await getDb().update(units).set({ status }).where(eq(units.id, id));
    await logAudit({ entity: "unit", entityId: id, action: "update", before: prev, after: { status }, userId: user.id });
    revalidatePath(backTo);
    revalidatePath("/properties");
    redirect(backTo);
  }

  const parsed = unitSchema.partial().safeParse({
    propertyId: formData.get("propertyId") ?? prev.propertyId,
    label: formData.get("label") ?? prev.label,
    type: formData.get("type") ?? prev.type,
    elecMeterNo: formData.get("elecMeterNo"),
    waterMeterNo: formData.get("waterMeterNo"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) redirect(backTo);

  const areaRaw = String(formData.get("areaSqft") ?? "").trim();
  const rentRaw = String(formData.get("expectedRent") ?? "");
  const set: Record<string, unknown> = {
    ...parsed.data,
    status: String(formData.get("status") ?? prev.status) === "maintenance" ? "maintenance" : "vacant",
  };
  if (formData.has("areaSqft")) set.areaSqft = areaRaw && !Number.isNaN(Number(areaRaw)) ? Number(areaRaw) : null;
  if (formData.has("expectedRent")) set.expectedRentPaise = toPaise(rentRaw || "0");

  await getDb().update(units).set(set).where(eq(units.id, id));
  await logAudit({ entity: "unit", entityId: id, action: "update", before: prev, after: set, userId: user.id });
  revalidatePath(`/properties/${prev.propertyId}`);
  revalidatePath("/properties");
  redirect(`/properties/${prev.propertyId}`);
}

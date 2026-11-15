"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { settings, users } from "@/db/schema";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";

export type FormState = { error?: string } | undefined;

const setupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/** First-run: create the owner account (allowed only when no user exists). */
export async function setupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = setupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const db = getDb();
  const anyUser = await db.select({ id: users.id }).from(users).limit(1);
  if (anyUser.length > 0) return { error: "Owner account already exists. Please log in." };

  const email = parsed.data.email.toLowerCase().trim();
  const dupe = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (dupe.length > 0) return { error: "This email is already registered." };

  const passwordHash = await hashPassword(parsed.data.password);
  const [user] = await db
    .insert(users)
    .values({ email, name: parsed.data.name.trim(), passwordHash })
    .returning({ id: users.id });

  await db
    .insert(settings)
    .values({ id: 1, ownerName: parsed.data.name.trim(), ownerEmail: email })
    .onConflictDoNothing();

  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter email and password." };

  const rows = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

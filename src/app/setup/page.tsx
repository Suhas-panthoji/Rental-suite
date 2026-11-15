import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { AuthCard } from "@/components/auth-card";
import { setupAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const rows = await getDb().select({ id: users.id }).from(users).limit(1);
  if (rows.length > 0) redirect("/login");

  return (
    <AuthCard
      title="Welcome to Rental Suite"
      subtitle="Create your owner account to get started. This screen appears only once."
      action={setupAction}
      submitLabel="Create owner account"
      fields={[
        { name: "name", label: "Your name", type: "text", placeholder: "e.g. Suhas Kumar" },
        { name: "email", label: "Email", type: "email", placeholder: "you@example.com" },
        { name: "password", label: "Password (min 6 characters)", type: "password", placeholder: "••••••" },
      ]}
    />
  );
}

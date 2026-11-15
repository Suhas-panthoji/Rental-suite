import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { users } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function Home() {
  const rows = await getDb().select({ id: users.id }).from(users).limit(1);
  redirect(rows.length === 0 ? "/setup" : "/dashboard");
}

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { Splash } from "@/components/splash";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const rows = await getDb().select({ id: users.id }).from(users).limit(1);
  const destination = user ? "/welcome" : rows.length === 0 ? "/setup" : "/login";
  return <Splash destination={destination} />;
}

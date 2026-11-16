import { requireUser } from "@/lib/auth";
import { WelcomeFlash } from "@/components/welcome-flash";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const user = await requireUser();
  return <WelcomeFlash name={user.name} />;
}

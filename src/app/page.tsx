import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LandingClient } from "@/components/landing-client";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/workspace");
  return (
    <main className="page-shell">
      <LandingClient />
    </main>
  );
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { buildBootstrap } from "@/lib/bootstrap";
import { WorkspaceClient } from "@/components/workspace-client";

export default async function WorkspacePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const bootstrap = await buildBootstrap(user);

  return (
    <main className="page-shell">
      <WorkspaceClient bootstrap={bootstrap} />
    </main>
  );
}

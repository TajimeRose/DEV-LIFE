import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) redirect("/login");
  return <WorkspaceShell email={user.email}>{children}</WorkspaceShell>;
}

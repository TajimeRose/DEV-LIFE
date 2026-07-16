import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getCurrentWorkspace } from "@/lib/current-workspace";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { user, project } = await getCurrentWorkspace();
  if (!user) redirect("/login");
  const displayName = typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : undefined;
  return <WorkspaceShell email={user.email} displayName={displayName} projectName={project?.name}>{children}</WorkspaceShell>;
}

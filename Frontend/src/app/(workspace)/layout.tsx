import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getCurrentWorkspace } from "@/lib/current-workspace";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { user, project, role } = await getCurrentWorkspace();
  if (!user) redirect("/login");
  if (!project) redirect("/projects");
  return <WorkspaceShell projectName={project.name} projectRole={role ?? "viewer"}>{children}</WorkspaceShell>;
}

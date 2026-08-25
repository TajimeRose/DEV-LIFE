import { ConnectedTemplates, NoProject } from "@/components/connected-features";
import { getCurrentWorkspace } from "@/lib/current-workspace";

export default async function Page() {
  const { project, role } = await getCurrentWorkspace();
  if (!project) return <NoProject />;
  return <ConnectedTemplates project={project} role={role ?? "viewer"} />;
}

import { ConnectedInbox, NoProject } from "@/components/connected-features";
import { getCurrentWorkspace } from "@/lib/current-workspace";
import { getIdeas } from "@/app/actions/data";

export default async function Page() {
  const { project, role } = await getCurrentWorkspace();
  if (!project) return <NoProject />;
  const ideas = await getIdeas(project.id);
  return <ConnectedInbox project={project} initialIdeas={ideas} role={role ?? "viewer"} />;
}

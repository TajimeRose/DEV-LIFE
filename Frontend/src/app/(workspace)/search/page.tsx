import { ConnectedSearch, NoProject } from "@/components/connected-features";
import { getCurrentWorkspace } from "@/lib/current-workspace";

export default async function Page() {
  const { project } = await getCurrentWorkspace();
  return project ? <ConnectedSearch project={project} /> : <NoProject />;
}

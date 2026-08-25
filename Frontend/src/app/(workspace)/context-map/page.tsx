import { ConnectedContextMap, NoProject } from "@/components/connected-features";
import { getCurrentWorkspace } from "@/lib/current-workspace";
import { getProjectContextMap } from "@/app/actions/data";

export default async function Page() {
  const { project } = await getCurrentWorkspace();
  if (!project) return <NoProject />;
  const data = await getProjectContextMap(project.id);
  return <ConnectedContextMap initialData={data} />;
}

import { ConnectedTasks, NoProject } from "@/components/connected-features";
import { getProjectWorkspace } from "@/lib/current-workspace";

export default async function Page() { const data = await getProjectWorkspace({ tasks: true }); return data.project ? <ConnectedTasks project={data.project} initial={data.tasks} role={data.role ?? "viewer"} /> : <NoProject />; }

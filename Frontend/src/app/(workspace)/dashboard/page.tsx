import { ConnectedDashboard, NoProject } from "@/components/connected-features";
import { getProjectWorkspace } from "@/lib/current-workspace";

export default async function Page() { const data = await getProjectWorkspace({ tasks: true, activities: true }); return data.project ? <ConnectedDashboard project={data.project} tasks={data.tasks} activities={data.activities} /> : <NoProject />; }

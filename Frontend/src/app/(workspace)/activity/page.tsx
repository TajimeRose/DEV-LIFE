import { ConnectedActivity, NoProject } from "@/components/connected-features";
import { getProjectWorkspace } from "@/lib/current-workspace";

export default async function Page() { const data = await getProjectWorkspace({ activities: true, repositoryActivities: true }); return data.project ? <ConnectedActivity project={data.project} activities={data.activities} repositoryActivities={data.repositoryActivities} /> : <NoProject />; }

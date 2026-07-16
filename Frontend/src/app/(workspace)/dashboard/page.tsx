import { ConnectedDashboard, NoProject } from "@/components/connected-features";
import { getCurrentWorkspace, getProjectWorkspace } from "@/lib/current-workspace";

export default async function Page() { const [data, { user }] = await Promise.all([getProjectWorkspace({ tasks: true, activities: true, activityLimit: 3 }), getCurrentWorkspace()]); const displayName = typeof user?.user_metadata.display_name === "string" ? user.user_metadata.display_name : user?.email?.split("@")[0]; return data.project ? <ConnectedDashboard project={data.project} tasks={data.tasks} activities={data.activities} displayName={displayName} /> : <NoProject />; }

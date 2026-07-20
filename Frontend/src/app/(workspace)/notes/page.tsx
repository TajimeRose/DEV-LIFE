import { ConnectedNotes, NoProject } from "@/components/connected-features";
import { getProjectWorkspace } from "@/lib/current-workspace";

export default async function Page() { const data = await getProjectWorkspace({ notes: true }); return data.project ? <ConnectedNotes project={data.project} initial={data.notes} role={data.role ?? "viewer"} /> : <NoProject />; }

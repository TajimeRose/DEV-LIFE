import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/current-workspace";

export default async function Page() { const { project } = await getCurrentWorkspace(); redirect(`/projects/${project!.id}/flowcharts`); }

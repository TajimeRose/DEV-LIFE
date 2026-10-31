import { redirect } from "next/navigation";
import { NoProject } from "@/components/connected-features";
import { getCurrentWorkspace } from "@/lib/current-workspace";

export default async function Page() {
  const { project } = await getCurrentWorkspace();
  if (!project) return <NoProject />;
  redirect(`/projects/${project.id}/flowcharts`);
}

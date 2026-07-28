import { RepositoryWorkspace } from "@/components/github/RepositoryWorkspace";
import { getCurrentWorkspace } from "@/lib/current-workspace";

export default async function RepositoryPage({
  params,
}: {
  params: Promise<{ projectId: string; repositoryId: string }>;
}) {
  const { projectId, repositoryId } = await params;
  const { project, role } = await getCurrentWorkspace();
  return <RepositoryWorkspace
    projectId={projectId}
    repositoryId={repositoryId}
    projectName={project?.id === projectId ? project.name : undefined}
    projectRole={project?.id === projectId ? role ?? "viewer" : "viewer"}
  />;
}

import { RepositoryTimeline } from "@/components/github/RepositoryTimeline";

export default async function RepositoryPage({
  params,
}: {
  params: Promise<{ projectId: string; repositoryId: string }>;
}) {
  const { projectId, repositoryId } = await params;
  return <RepositoryTimeline projectId={projectId} repositoryId={repositoryId} />;
}

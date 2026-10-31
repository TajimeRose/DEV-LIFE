import { NoProject } from "@/components/connected-features";
import { GitHubRepositoryBrowser } from "@/components/github/GitHubRepositoryBrowser";
import { githubPrivateReposEnabled } from "@/lib/github/config";
import { getCurrentWorkspace } from "@/lib/current-workspace";

export default async function Page({ searchParams }: { searchParams: Promise<{ github?: string }> }) {
  const [status, { project, role }] = await Promise.all([
    searchParams.then(value => value.github),
    getCurrentWorkspace(),
  ]);
  if (!project) return <NoProject />;
  return <GitHubRepositoryBrowser
    projectId={project.id}
    projectRole={role ?? "viewer"}
    privateReposEnabled={githubPrivateReposEnabled()}
    callbackStatus={status}
  />;
}

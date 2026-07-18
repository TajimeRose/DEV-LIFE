import { GitHubRepositoryBrowser } from "@/components/github/GitHubRepositoryBrowser";
import { githubPrivateReposEnabled } from "@/lib/github/config";
import { getCurrentWorkspace } from "@/lib/current-workspace";

export default async function Page({ searchParams }: { searchParams: Promise<{ github?: string }> }) {
  const [status, { project }] = await Promise.all([
    searchParams.then(value => value.github),
    getCurrentWorkspace(),
  ]);
  return <GitHubRepositoryBrowser
    projectId={project!.id}
    privateReposEnabled={githubPrivateReposEnabled()}
    callbackStatus={status}
  />;
}

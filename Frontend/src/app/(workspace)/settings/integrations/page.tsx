import { GitHubRepositoryBrowser } from "@/components/github/GitHubRepositoryBrowser";
import { githubPrivateReposEnabled } from "@/lib/github/config";

export default async function Page({ searchParams }: { searchParams: Promise<{ github?: string }> }) {
  const status = (await searchParams).github;
  return <GitHubRepositoryBrowser
    privateReposEnabled={githubPrivateReposEnabled()}
    callbackStatus={status}
  />;
}

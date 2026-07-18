import type { Tables } from "@/lib/database.types";

export type PullRequestDetailDependencies = {
  findPullRequest: (pullRequestId: string) => Promise<Tables<"repository_pull_requests"> | null>;
  listReviews: (pullRequestId: string) => Promise<Tables<"repository_pull_request_reviews">[]>;
};

export async function loadPullRequestDetail(
  pullRequestId: string,
  dependencies: PullRequestDetailDependencies,
) {
  const [pullRequest, reviews] = await Promise.all([
    dependencies.findPullRequest(pullRequestId),
    dependencies.listReviews(pullRequestId),
  ]);
  if (!pullRequest) return null;
  return {
    pullRequest,
    reviews,
    relatedCommits: [] as const,
    diff: {
      available: false as const,
      reason: "Commit-to-Pull-Request and diff data are not stored in the current schema.",
    },
  };
}

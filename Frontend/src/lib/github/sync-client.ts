import { z } from "zod";
import {
  GITHUB_API_ORIGIN,
  GITHUB_API_VERSION,
  GITHUB_REQUEST_TIMEOUT_MS,
} from "./config.ts";
import { GitHubClientError } from "./client.ts";

const date = z.iso.datetime({ offset: true }).nullable();
const user = z.object({
  login: z.string().min(1),
  avatar_url: z.string().url().nullable(),
}).nullable();

const branchSchema = z.object({
  name: z.string().min(1),
  protected: z.boolean().default(false),
  commit: z.object({ sha: z.string().min(7) }),
});

const commitSchema = z.object({
  sha: z.string().min(7),
  html_url: z.string().url().nullable(),
  author: user,
  parents: z.array(z.object({ sha: z.string().min(7) })).max(100),
  commit: z.object({
    message: z.string(),
    author: z.object({
      name: z.string().nullable(),
      email: z.string().nullable(),
      date,
    }).nullable(),
    committer: z.object({
      name: z.string().nullable(),
    }).nullable(),
    verification: z.object({
      verified: z.boolean(),
      reason: z.string().nullable(),
    }).nullable().optional(),
  }),
});

const pullRequestSchema = z.object({
  id: z.number().int().positive(),
  number: z.number().int().positive(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.string().min(1),
  html_url: z.string().url().nullable(),
  draft: z.boolean().default(false),
  user,
  head: z.object({ ref: z.string(), sha: z.string().nullable() }),
  base: z.object({ ref: z.string() }),
  created_at: date,
  updated_at: date,
  closed_at: date,
  merged_at: date,
  merged_by: user.optional(),
  comments: z.number().int().nonnegative().optional(),
  commits: z.number().int().nonnegative().optional(),
  additions: z.number().int().nonnegative().optional(),
  deletions: z.number().int().nonnegative().optional(),
  changed_files: z.number().int().nonnegative().optional(),
  mergeable: z.boolean().nullable().optional(),
  mergeable_state: z.string().nullable().optional(),
});

const reviewSchema = z.object({
  id: z.number().int().positive(),
  user,
  body: z.string().nullable(),
  state: z.string().min(1),
  commit_id: z.string().nullable(),
  submitted_at: date,
});

export type GitHubSyncSnapshot = {
  branches: Array<{
    name: string;
    protected: boolean;
    latestCommitSha: string;
  }>;
  commits: Array<{
    sha: string;
    message: string;
    messageBody: string | null;
    authorName: string | null;
    authorEmail: string | null;
    authorGitHubLogin: string | null;
    authorAvatarUrl: string | null;
    committerName: string | null;
    committedAt: string | null;
    parentShas: string[];
    githubUrl: string | null;
    verificationStatus: string | null;
  }>;
  pullRequests: Array<{
    githubId: number;
    number: number;
    title: string;
    description: string | null;
    state: string;
    sourceBranch: string;
    targetBranch: string;
    headSha: string | null;
    authorGitHubLogin: string | null;
    authorAvatarUrl: string | null;
    githubCreatedAt: string | null;
    githubUpdatedAt: string | null;
    closedAt: string | null;
    mergedAt: string | null;
    mergedByGitHubLogin: string | null;
    githubUrl: string | null;
    isDraft: boolean;
    isMergeable: boolean | null;
    hasConflicts: boolean;
    commentsCount: number;
    commitsCount: number;
    additions: number;
    deletions: number;
    changedFilesCount: number;
  }>;
  reviews: Array<{
    githubId: number;
    pullRequestNumber: number;
    reviewerGitHubLogin: string | null;
    reviewerAvatarUrl: string | null;
    body: string | null;
    state: string;
    commitSha: string | null;
    submittedAt: string | null;
  }>;
};

type GitHubFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function responseError(response: Response) {
  if (response.status === 401) return new GitHubClientError("auth");
  if (response.status === 403) return new GitHubClientError("permission");
  if (response.status === 404) return new GitHubClientError("not_found");
  if (response.status >= 500) return new GitHubClientError("unavailable");
  return new GitHubClientError("invalid_response");
}

async function githubJson(path: string, token: string, fetcher: GitHubFetch, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(new URL(path, GITHUB_API_ORIGIN), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "User-Agent": "DEV-LIFE",
      },
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
    if (!response.ok) throw responseError(response);
    return await response.json() as unknown;
  } catch (error) {
    if (error instanceof GitHubClientError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new GitHubClientError("timeout");
    }
    if (error instanceof SyntaxError) throw new GitHubClientError("invalid_response");
    throw new GitHubClientError("unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchGitHubRepositorySnapshot(
  token: string,
  owner: string,
  name: string,
  fetcher: GitHubFetch = fetch,
  timeoutMs = GITHUB_REQUEST_TIMEOUT_MS,
): Promise<GitHubSyncSnapshot> {
  const repositoryPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  const [branchesInput, commitsInput, pullRequestsInput] = await Promise.all([
    githubJson(`${repositoryPath}/branches?per_page=100`, token, fetcher, timeoutMs),
    githubJson(`${repositoryPath}/commits?per_page=50`, token, fetcher, timeoutMs),
    githubJson(`${repositoryPath}/pulls?state=all&per_page=50`, token, fetcher, timeoutMs),
  ]);

  const branches = z.array(branchSchema).max(100).parse(branchesInput);
  const commits = z.array(commitSchema).max(100).parse(commitsInput);
  const pullRequests = z.array(pullRequestSchema).max(100).parse(pullRequestsInput);
  const reviewGroups = await Promise.all(pullRequests.slice(0, 50).map(async pullRequest => ({
    pullRequestNumber: pullRequest.number,
    reviews: z.array(reviewSchema).max(100).parse(
      await githubJson(`${repositoryPath}/pulls/${pullRequest.number}/reviews?per_page=100`, token, fetcher, timeoutMs),
    ),
  })));

  return {
    branches: branches.map(branch => ({
      name: branch.name,
      protected: branch.protected,
      latestCommitSha: branch.commit.sha,
    })),
    commits: commits.map(commit => {
      const [message, ...body] = commit.commit.message.split("\n");
      return {
        sha: commit.sha,
        message: message || commit.sha,
        messageBody: body.join("\n").trim() || null,
        authorName: commit.commit.author?.name ?? null,
        authorEmail: commit.commit.author?.email ?? null,
        authorGitHubLogin: commit.author?.login ?? null,
        authorAvatarUrl: commit.author?.avatar_url ?? null,
        committerName: commit.commit.committer?.name ?? null,
        committedAt: commit.commit.author?.date ?? null,
        parentShas: commit.parents.map(parent => parent.sha),
        githubUrl: commit.html_url,
        verificationStatus: commit.commit.verification
          ? (commit.commit.verification.verified ? "verified" : commit.commit.verification.reason ?? "unverified")
          : null,
      };
    }),
    pullRequests: pullRequests.map(pullRequest => ({
      githubId: pullRequest.id,
      number: pullRequest.number,
      title: pullRequest.title,
      description: pullRequest.body,
      state: pullRequest.state,
      sourceBranch: pullRequest.head.ref,
      targetBranch: pullRequest.base.ref,
      headSha: pullRequest.head.sha,
      authorGitHubLogin: pullRequest.user?.login ?? null,
      authorAvatarUrl: pullRequest.user?.avatar_url ?? null,
      githubCreatedAt: pullRequest.created_at,
      githubUpdatedAt: pullRequest.updated_at,
      closedAt: pullRequest.closed_at,
      mergedAt: pullRequest.merged_at,
      mergedByGitHubLogin: pullRequest.merged_by?.login ?? null,
      githubUrl: pullRequest.html_url,
      isDraft: pullRequest.draft,
      isMergeable: pullRequest.mergeable ?? null,
      hasConflicts: pullRequest.mergeable_state === "dirty",
      commentsCount: pullRequest.comments ?? 0,
      commitsCount: pullRequest.commits ?? 0,
      additions: pullRequest.additions ?? 0,
      deletions: pullRequest.deletions ?? 0,
      changedFilesCount: pullRequest.changed_files ?? 0,
    })),
    reviews: reviewGroups.flatMap(group => group.reviews.map(review => ({
      githubId: review.id,
      pullRequestNumber: group.pullRequestNumber,
      reviewerGitHubLogin: review.user?.login ?? null,
      reviewerAvatarUrl: review.user?.avatar_url ?? null,
      body: review.body,
      state: review.state,
      commitSha: review.commit_id,
      submittedAt: review.submitted_at,
    }))),
  };
}

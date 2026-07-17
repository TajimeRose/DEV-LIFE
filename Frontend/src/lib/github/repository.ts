import { z } from "zod";

const githubHtmlUrl = z.string().url().refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && url.hostname === "github.com";
}, "Invalid GitHub repository URL");

const githubDate = z.iso.datetime({ offset: true });

const rawRepository = z.object({
  id: z.number().int().positive(),
  node_id: z.string().min(1),
  name: z.string().min(1),
  full_name: z.string().min(3),
  owner: z.object({
    login: z.string().min(1),
    avatar_url: z.string().url().nullable(),
  }),
  description: z.string().nullable(),
  html_url: githubHtmlUrl,
  private: z.boolean(),
  fork: z.boolean(),
  archived: z.boolean(),
  disabled: z.boolean(),
  visibility: z.enum(["public", "private", "internal"]).nullable().optional(),
  default_branch: z.string().min(1),
  language: z.string().nullable(),
  stargazers_count: z.number().int().nonnegative(),
  forks_count: z.number().int().nonnegative(),
  open_issues_count: z.number().int().nonnegative(),
  created_at: githubDate,
  updated_at: githubDate,
  pushed_at: githubDate.nullable(),
});

const rawRepositoryList = z.array(rawRepository).max(100);

export type GitHubRepository = {
  id: number;
  nodeId: string;
  name: string;
  fullName: string;
  ownerLogin: string;
  ownerAvatarUrl: string | null;
  description: string | null;
  htmlUrl: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  disabled: boolean;
  visibility: "public" | "private" | "internal" | null;
  defaultBranch: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  createdAt: string;
  updatedAt: string;
  pushedAt: string | null;
};

function safeAvatarUrl(value: string | null) {
  if (!value) return null;
  const url = new URL(value);
  return url.protocol === "https:" ? url.toString() : null;
}

export function sanitizeGitHubRepositories(input: unknown): GitHubRepository[] {
  return rawRepositoryList.parse(input).map(repository => ({
    id: repository.id,
    nodeId: repository.node_id,
    name: repository.name,
    fullName: repository.full_name,
    ownerLogin: repository.owner.login,
    ownerAvatarUrl: safeAvatarUrl(repository.owner.avatar_url),
    description: repository.description,
    htmlUrl: repository.html_url,
    private: repository.private,
    fork: repository.fork,
    archived: repository.archived,
    disabled: repository.disabled,
    visibility: repository.visibility ?? null,
    defaultBranch: repository.default_branch,
    language: repository.language,
    stargazersCount: repository.stargazers_count,
    forksCount: repository.forks_count,
    openIssuesCount: repository.open_issues_count,
    createdAt: repository.created_at,
    updatedAt: repository.updated_at,
    pushedAt: repository.pushed_at,
  }));
}

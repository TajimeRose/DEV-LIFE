import { z } from "zod";
import { GITHUB_MAX_PAGE, GITHUB_PAGE_SIZE } from "./config.ts";

const repositoryQuery = z.object({
  page: z.coerce.number().int().min(1).max(GITHUB_MAX_PAGE).default(1),
  visibility: z.enum(["all", "public", "private"]).default("all"),
  sort: z.enum(["updated", "created", "pushed", "full_name"]).default("updated"),
  direction: z.enum(["asc", "desc"]).default("desc"),
  affiliation: z.enum(["all", "owner", "collaborator", "organization"]).default("all"),
  archived: z.enum(["all", "active", "archived"]).default("all"),
  search: z.string().trim().max(100).default(""),
  perPage: z.literal(GITHUB_PAGE_SIZE).default(GITHUB_PAGE_SIZE),
});

export type GitHubRepositoryQuery = z.infer<typeof repositoryQuery>;

export class GitHubQueryError extends Error {
  readonly reason: "invalid" | "private_disabled";

  constructor(reason: "invalid" | "private_disabled") {
    super(reason);
    this.reason = reason;
  }
}

export function parseGitHubRepositoryQuery(url: URL, privateReposEnabled: boolean) {
  const perPage = url.searchParams.get("per_page");
  const parsed = repositoryQuery.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    visibility: url.searchParams.get("visibility") ?? (privateReposEnabled ? "all" : "public"),
    sort: url.searchParams.get("sort") ?? undefined,
    direction: url.searchParams.get("direction") ?? undefined,
    affiliation: url.searchParams.get("affiliation") ?? undefined,
    archived: url.searchParams.get("archived") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    perPage: perPage === null ? undefined : Number(perPage),
  });
  if (!parsed.success) throw new GitHubQueryError("invalid");
  if (!privateReposEnabled && parsed.data.visibility === "private") {
    throw new GitHubQueryError("private_disabled");
  }
  return parsed.data;
}

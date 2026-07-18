import {
  GITHUB_API_ORIGIN,
  GITHUB_API_VERSION,
  GITHUB_MAX_PAGE,
  GITHUB_REQUEST_TIMEOUT_MS,
} from "./config.ts";
import type { GitHubRepositoryQuery } from "./query.ts";
import { sanitizeGitHubRepositories, type GitHubRepository } from "./repository.ts";

type AllowedGitHubMethod = "GET";
type AllowedGitHubPath = "/user/repos";

export type GitHubClientErrorKind =
  | "auth"
  | "permission"
  | "rate_limit"
  | "not_found"
  | "timeout"
  | "invalid_response"
  | "unavailable";

export class GitHubClientError extends Error {
  readonly kind: GitHubClientErrorKind;

  constructor(kind: GitHubClientErrorKind) {
    super(kind);
    this.kind = kind;
  }
}

type GitHubFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function affiliationValue(value: GitHubRepositoryQuery["affiliation"]) {
  if (value === "owner") return "owner";
  if (value === "collaborator") return "collaborator";
  if (value === "organization") return "organization_member";
  return "owner,collaborator,organization_member";
}

async function githubGet(
  path: AllowedGitHubPath,
  token: string,
  query: GitHubRepositoryQuery,
  fetcher: GitHubFetch,
  timeoutMs: number,
) {
  const method: AllowedGitHubMethod = "GET";
  const url = new URL(path, GITHUB_API_ORIGIN);
  url.searchParams.set("visibility", query.visibility);
  url.searchParams.set("affiliation", affiliationValue(query.affiliation));
  url.searchParams.set("sort", query.sort);
  url.searchParams.set("direction", query.direction);
  url.searchParams.set("per_page", String(query.perPage));
  url.searchParams.set("page", String(query.page));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(url, {
      method,
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
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new GitHubClientError("timeout");
    }
    throw new GitHubClientError("unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

function statusError(response: Response) {
  if (response.status === 401) return new GitHubClientError("auth");
  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") return new GitHubClientError("rate_limit");
  if (response.status === 403) return new GitHubClientError("permission");
  if (response.status === 404) return new GitHubClientError("not_found");
  if (response.status >= 500 || (response.status >= 300 && response.status < 400)) return new GitHubClientError("unavailable");
  return new GitHubClientError("invalid_response");
}

function filterRepositories(repositories: GitHubRepository[], query: GitHubRepositoryQuery) {
  const search = query.search.toLocaleLowerCase();
  return repositories.filter(repository => {
    if (query.archived === "archived" && !repository.archived) return false;
    if (query.archived === "active" && repository.archived) return false;
    if (!search) return true;
    return [repository.name, repository.fullName, repository.description ?? ""]
      .some(value => value.toLocaleLowerCase().includes(search));
  });
}

export async function listGitHubRepositories(
  token: string,
  query: GitHubRepositoryQuery,
  privateReposEnabled: boolean,
  fetcher: GitHubFetch = fetch,
  timeoutMs = GITHUB_REQUEST_TIMEOUT_MS,
) {
  const response = await githubGet("/user/repos", token, query, fetcher, timeoutMs);
  if (!response.ok) throw statusError(response);

  let input: unknown;
  try {
    input = await response.json();
  } catch {
    throw new GitHubClientError("invalid_response");
  }

  let repositories: GitHubRepository[];
  try {
    repositories = sanitizeGitHubRepositories(input);
  } catch {
    throw new GitHubClientError("invalid_response");
  }
  if (!privateReposEnabled) repositories = repositories.filter(repository => !repository.private);

  return {
    repositories: filterRepositories(repositories, query),
    hasNext: query.page < GITHUB_MAX_PAGE && response.headers.get("link")?.includes('rel="next"') === true,
  };
}

export async function getGitHubRepository(
  token: string,
  repositoryId: number,
  privateReposEnabled: boolean,
  fetcher: GitHubFetch = fetch,
  timeoutMs = GITHUB_REQUEST_TIMEOUT_MS,
) {
  if (!Number.isSafeInteger(repositoryId) || repositoryId <= 0) {
    throw new GitHubClientError("not_found");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetcher(new URL(`/repositories/${repositoryId}`, GITHUB_API_ORIGIN), {
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
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new GitHubClientError("timeout");
    }
    throw new GitHubClientError("unavailable");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) throw statusError(response);

  let input: unknown;
  try {
    input = await response.json();
  } catch {
    throw new GitHubClientError("invalid_response");
  }

  let repository: GitHubRepository;
  try {
    [repository] = sanitizeGitHubRepositories([input]);
  } catch {
    throw new GitHubClientError("invalid_response");
  }
  if (!repository || (!privateReposEnabled && repository.private)) {
    throw new GitHubClientError("permission");
  }
  return repository;
}

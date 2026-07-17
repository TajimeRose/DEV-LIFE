import { GitHubClientError } from "./client.ts";
import { GitHubQueryError, parseGitHubRepositoryQuery, type GitHubRepositoryQuery } from "./query.ts";
import type { GitHubRepository } from "./repository.ts";

export type GitHubErrorCode =
  | "UNAUTHENTICATED"
  | "GITHUB_NOT_CONNECTED"
  | "GITHUB_AUTH_REQUIRED"
  | "GITHUB_PERMISSION_REQUIRED"
  | "GITHUB_RATE_LIMITED"
  | "RATE_LIMITED"
  | "GITHUB_UNAVAILABLE"
  | "REQUEST_TIMEOUT"
  | "INVALID_REQUEST"
  | "INTERNAL_ERROR";

type Authentication = {
  userId: string;
  githubIdentity: boolean;
};

type HandlerDependencies = {
  authenticate: () => Promise<Authentication | null>;
  readToken: (userId: string) => Promise<string | null>;
  rateLimit: (userId: string) => boolean;
  privateReposEnabled: boolean;
  listRepositories: (
    token: string,
    query: GitHubRepositoryQuery,
    privateReposEnabled: boolean,
  ) => Promise<{ repositories: GitHubRepository[]; hasNext: boolean }>;
};

const noStoreHeaders = { "Cache-Control": "private, no-store" };

function errorResponse(status: number, code: GitHubErrorCode, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: noStoreHeaders });
}

function clientErrorResponse(error: GitHubClientError) {
  if (error.kind === "auth") return errorResponse(401, "GITHUB_AUTH_REQUIRED", "Please reconnect your GitHub account.");
  if (error.kind === "permission") return errorResponse(403, "GITHUB_PERMISSION_REQUIRED", "This repository may require approval from your GitHub organization or an active SSO authorization.");
  if (error.kind === "rate_limit") return errorResponse(403, "GITHUB_RATE_LIMITED", "GitHub rate limit reached. Please try again later.");
  if (error.kind === "timeout") return errorResponse(504, "REQUEST_TIMEOUT", "The GitHub request timed out. Please try again.");
  if (error.kind === "not_found") return errorResponse(404, "GITHUB_UNAVAILABLE", "GitHub repository information is unavailable.");
  if (error.kind === "invalid_response") return errorResponse(502, "GITHUB_UNAVAILABLE", "GitHub returned an invalid response.");
  return errorResponse(503, "GITHUB_UNAVAILABLE", "GitHub is temporarily unavailable.");
}

export async function handleRepositoriesRequest(request: Request, dependencies: HandlerDependencies) {
  let auth: Authentication | null;
  try {
    auth = await dependencies.authenticate();
  } catch {
    return errorResponse(500, "INTERNAL_ERROR", "Unable to verify your session.");
  }
  if (!auth) return errorResponse(401, "UNAUTHENTICATED", "Please sign in to continue.");
  if (!dependencies.rateLimit(auth.userId)) {
    return errorResponse(429, "RATE_LIMITED", "Too many GitHub requests. Please try again shortly.");
  }

  let query: GitHubRepositoryQuery;
  try {
    query = parseGitHubRepositoryQuery(new URL(request.url), dependencies.privateReposEnabled);
  } catch (error) {
    if (error instanceof GitHubQueryError && error.reason === "private_disabled") {
      return errorResponse(403, "GITHUB_PERMISSION_REQUIRED", "Private repository access is not enabled.");
    }
    return errorResponse(400, "INVALID_REQUEST", "Invalid repository request.");
  }

  let token: string | null;
  try {
    token = await dependencies.readToken(auth.userId);
  } catch {
    return errorResponse(500, "INTERNAL_ERROR", "GitHub connection is not configured.");
  }
  if (!token) {
    return auth.githubIdentity
      ? errorResponse(401, "GITHUB_AUTH_REQUIRED", "Please reconnect your GitHub account.")
      : errorResponse(401, "GITHUB_NOT_CONNECTED", "Connect your GitHub account to view repositories.");
  }

  try {
    const result = await dependencies.listRepositories(token, query, dependencies.privateReposEnabled);
    return Response.json({
      data: {
        repositories: result.repositories,
        pagination: { page: query.page, hasNext: result.hasNext },
        privateReposEnabled: dependencies.privateReposEnabled,
      },
    }, { headers: noStoreHeaders });
  } catch (error) {
    if (error instanceof GitHubClientError) return clientErrorResponse(error);
    return errorResponse(500, "INTERNAL_ERROR", "Unable to load GitHub repositories.");
  }
}

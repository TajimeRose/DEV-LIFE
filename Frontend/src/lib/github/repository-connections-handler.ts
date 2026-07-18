import { ProjectAccessError } from "../projects/authorization.ts";
import type { Tables } from "@/lib/database.types";
import type { GitHubRepository } from "./repository.ts";

export type RepositoryConnectionErrorCode =
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "INVALID_REQUEST"
  | "GITHUB_NOT_CONNECTED"
  | "GITHUB_UNAVAILABLE"
  | "DUPLICATE_REPOSITORY"
  | "INTERNAL_ERROR";

type ConnectedRepository = Tables<"project_repositories">;

export type RepositoryConnectionDependencies = {
  authenticate: () => Promise<{ userId: string } | null>;
  authorize: (projectId: string, userId: string) => Promise<void>;
  list: (projectId: string) => Promise<ConnectedRepository[]>;
  findDuplicate: (projectId: string, githubRepositoryId: number) => Promise<ConnectedRepository | null>;
  readGitHubRepository: (userId: string, githubRepositoryId: number) => Promise<GitHubRepository | null>;
  insert: (projectId: string, userId: string, repository: GitHubRepository) => Promise<ConnectedRepository>;
  recordConnection: (projectId: string, userId: string, repository: ConnectedRepository) => Promise<void>;
  reportError?: (operation: "list" | "connect" | "record_activity", error: unknown) => void;
};

const headers = { "Cache-Control": "private, no-store" };

function errorResponse(status: number, code: RepositoryConnectionErrorCode, message: string) {
  return Response.json({ error: { code, message } }, { status, headers });
}

function reportError(
  dependencies: RepositoryConnectionDependencies,
  operation: "list" | "connect" | "record_activity",
  error: unknown,
) {
  try {
    dependencies.reportError?.(operation, error);
  } catch {
    // Error reporting must never replace the response from this handler.
  }
}

async function authenticateAndAuthorize(
  projectId: string,
  dependencies: RepositoryConnectionDependencies,
): Promise<
  | { ok: true; auth: { userId: string } }
  | { ok: false; response: Response }
> {
  const auth = await dependencies.authenticate();
  if (!auth) return { ok: false, response: errorResponse(401, "UNAUTHENTICATED", "Please sign in to continue.") };
  try {
    await dependencies.authorize(projectId, auth.userId);
    return { ok: true, auth };
  } catch (error) {
    if (error instanceof ProjectAccessError) {
      return { ok: false, response: errorResponse(error.status, "UNAUTHORIZED", "You do not have access to this project.") };
    }
    throw error;
  }
}

export async function handleProjectRepositoriesGet(
  projectId: string,
  dependencies: RepositoryConnectionDependencies,
): Promise<Response> {
  try {
    const access = await authenticateAndAuthorize(projectId, dependencies);
    if (!access.ok) return access.response;
    const repositories = await dependencies.list(projectId);
    return Response.json({ data: { repositories } }, { headers });
  } catch (error) {
    reportError(dependencies, "list", error);
    return errorResponse(500, "INTERNAL_ERROR", "Unable to load connected repositories.");
  }
}

export async function handleProjectRepositoriesPost(
  request: Request,
  projectId: string,
  dependencies: RepositoryConnectionDependencies,
): Promise<Response> {
  try {
    const access = await authenticateAndAuthorize(projectId, dependencies);
    if (!access.ok) return access.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "INVALID_REQUEST", "Invalid repository request.");
    }
    const repositoryId = typeof body === "object" && body !== null
      ? (body as { githubRepositoryId?: unknown }).githubRepositoryId
      : undefined;
    if (!Number.isSafeInteger(repositoryId) || Number(repositoryId) <= 0) {
      return errorResponse(400, "INVALID_REQUEST", "A valid GitHub repository is required.");
    }

    const existing = await dependencies.findDuplicate(projectId, Number(repositoryId));
    if (existing) {
      return errorResponse(409, "DUPLICATE_REPOSITORY", "This repository is already connected to the project.");
    }

    const githubRepository = await dependencies.readGitHubRepository(access.auth.userId, Number(repositoryId));
    if (!githubRepository) {
      return errorResponse(401, "GITHUB_NOT_CONNECTED", "Connect or reconnect GitHub before adding a repository.");
    }

    let repository: ConnectedRepository;
    try {
      repository = await dependencies.insert(projectId, access.auth.userId, githubRepository);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
      ) {
        return errorResponse(409, "DUPLICATE_REPOSITORY", "This repository is already connected to the project.");
      }
      throw error;
    }

    try {
      await dependencies.recordConnection(projectId, access.auth.userId, repository);
    } catch (error) {
      reportError(dependencies, "record_activity", error);
    }
    return Response.json({ data: { repository } }, { status: 201, headers });
  } catch (error) {
    reportError(dependencies, "connect", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "kind" in error
    ) {
      return errorResponse(502, "GITHUB_UNAVAILABLE", "GitHub repository information is unavailable.");
    }
    return errorResponse(500, "INTERNAL_ERROR", "Unable to connect the repository.");
  }
}

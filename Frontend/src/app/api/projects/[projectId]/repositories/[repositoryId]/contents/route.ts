import { z } from "zod";
import { GitHubClientError } from "@/lib/github/client";
import {
  fetchGitHubContents,
  GitHubContentsValidationError,
  normalizeGitHubPath,
  validateGitHubRef,
} from "@/lib/github/contents";
import { authorizeRepositoryRead, privateNoStore, repositoryReadError } from "@/lib/github/repository-read-route";
import { readGitHubToken } from "@/lib/github/token-vault";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  path: z.string().max(1024).default(""),
  ref: z.string().max(255).optional(),
}).strict();

type RouteContext = { params: Promise<{ projectId: string; repositoryId: string }> };

function contentsError(cause: GitHubClientError) {
  if (cause.kind === "auth") return repositoryReadError(401, "GITHUB_NOT_CONNECTED", "Reconnect GitHub before browsing repository contents.");
  if (cause.kind === "permission") return repositoryReadError(403, "GITHUB_FORBIDDEN", "GitHub does not allow access to these repository contents.");
  if (cause.kind === "not_found") return repositoryReadError(404, "CONTENT_NOT_FOUND", "The requested repository content was not found.");
  if (cause.kind === "rate_limit") return repositoryReadError(429, "GITHUB_RATE_LIMITED", "GitHub rate limit reached. Try again shortly.");
  return repositoryReadError(502, "GITHUB_UNAVAILABLE", "Repository contents are temporarily unavailable.");
}

export async function GET(request: Request, { params }: RouteContext) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return repositoryReadError(400, "INVALID_REQUEST", "Invalid repository content path or ref.");
  try {
    normalizeGitHubPath(parsed.data.path);
  } catch {
    return repositoryReadError(400, "INVALID_REQUEST", "Invalid repository content path or ref.");
  }

  const { projectId, repositoryId } = await params;
  const access = await authorizeRepositoryRead(projectId, repositoryId);
  if (!access.ok) return access.response;
  const ref = parsed.data.ref ?? access.repository.default_branch;
  if (!ref || !validateGitHubRef(ref)) return repositoryReadError(400, "INVALID_REQUEST", "Invalid repository content path or ref.");

  const token = await readGitHubToken(access.userId);
  if (!token) return repositoryReadError(401, "GITHUB_NOT_CONNECTED", "Reconnect GitHub before browsing repository contents.");

  try {
    const contents = await fetchGitHubContents(
      token,
      access.repository.github_owner,
      access.repository.github_name,
      parsed.data.path,
      ref,
    );
    return Response.json({ data: contents }, { headers: privateNoStore });
  } catch (cause) {
    if (cause instanceof GitHubContentsValidationError) {
      if (cause.message === "file_too_large") return repositoryReadError(413, "FILE_TOO_LARGE", "The requested file is too large to display.");
      return repositoryReadError(400, "INVALID_REQUEST", "Invalid repository content path or ref.");
    }
    if (cause instanceof GitHubClientError) return contentsError(cause);
    return repositoryReadError(502, "GITHUB_UNAVAILABLE", "Repository contents are temporarily unavailable.");
  }
}

import { z } from "zod";
import { GitHubClientError } from "@/lib/github/client";
import { fetchGitHubCommitDetail } from "@/lib/github/commit-detail";
import { readGitHubToken } from "@/lib/github/token-vault";
import { authorizeProjectAccess, ProjectAccessError } from "@/lib/projects/authorization";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store" };
const shaSchema = z.string().regex(/^[a-f0-9]{7,64}$/i);

function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: noStore });
}

type RouteContext = {
  params: Promise<{ projectId: string; repositoryId: string; sha: string }>;
};

function githubError(cause: GitHubClientError) {
  if (cause.kind === "auth") {
    return error(401, "GITHUB_NOT_CONNECTED", "Reconnect GitHub before loading commit details.");
  }
  if (cause.kind === "permission") {
    return error(403, "GITHUB_FORBIDDEN", "GitHub does not allow access to this commit.");
  }
  if (cause.kind === "not_found") {
    return error(404, "COMMIT_NOT_FOUND", "The commit is no longer available on GitHub.");
  }
  if (cause.kind === "rate_limit") {
    return error(429, "GITHUB_RATE_LIMITED", "GitHub rate limit reached. Try again shortly.");
  }
  return error(502, "GITHUB_UNAVAILABLE", "GitHub commit details are temporarily unavailable.");
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { projectId, repositoryId, sha: inputSha } = await params;
  const parsedSha = shaSchema.safeParse(inputSha);
  if (!parsedSha.success) return error(400, "INVALID_REQUEST", "Invalid commit SHA.");

  const supabase = await createClient();
  const { data: claims, error: authError } = await supabase.auth.getClaims();
  if (authError || !claims?.claims.sub) {
    return error(401, "UNAUTHENTICATED", "Please sign in to continue.");
  }

  try {
    await authorizeProjectAccess(supabase, claims.claims.sub, projectId);
  } catch (cause) {
    if (cause instanceof ProjectAccessError) {
      return error(cause.status, "UNAUTHORIZED", "You do not have access to this project.");
    }
    return error(500, "INTERNAL_ERROR", "Unable to verify project access.");
  }

  const [repositoryResult, commitResult] = await Promise.all([
    supabase
      .from("project_repositories")
      .select("github_owner,github_name")
      .eq("id", repositoryId)
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("repository_commits")
      .select("sha")
      .eq("repository_id", repositoryId)
      .eq("sha", parsedSha.data)
      .maybeSingle(),
  ]);
  if (repositoryResult.error || commitResult.error) {
    return error(500, "INTERNAL_ERROR", "Unable to load the commit.");
  }
  if (!repositoryResult.data || !commitResult.data) {
    return error(404, "NOT_FOUND", "Commit not found.");
  }

  const token = await readGitHubToken(claims.claims.sub);
  if (!token) {
    return error(401, "GITHUB_NOT_CONNECTED", "Reconnect GitHub before loading commit details.");
  }

  try {
    const detail = await fetchGitHubCommitDetail(
      token,
      repositoryResult.data.github_owner,
      repositoryResult.data.github_name,
      commitResult.data.sha,
    );
    return Response.json({ data: detail }, { headers: noStore });
  } catch (cause) {
    if (cause instanceof GitHubClientError) return githubError(cause);
    return error(502, "GITHUB_UNAVAILABLE", "GitHub commit details are temporarily unavailable.");
  }
}

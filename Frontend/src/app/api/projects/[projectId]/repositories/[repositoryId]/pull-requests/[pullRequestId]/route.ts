import { authorizeProjectAccess, ProjectAccessError } from "@/lib/projects/authorization";
import { loadPullRequestDetail } from "@/lib/github/pull-request-detail";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store" };

function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: noStore });
}

type RouteContext = {
  params: Promise<{ projectId: string; repositoryId: string; pullRequestId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { projectId, repositoryId, pullRequestId } = await params;
  const supabase = await createClient();
  const { data: claims, error: authError } = await supabase.auth.getClaims();
  if (authError || !claims?.claims.sub) return error(401, "UNAUTHENTICATED", "Please sign in to continue.");

  try {
    await authorizeProjectAccess(supabase, claims.claims.sub, projectId);
  } catch (cause) {
    if (cause instanceof ProjectAccessError) {
      return error(cause.status, "UNAUTHORIZED", "You do not have access to this project.");
    }
    return error(500, "INTERNAL_ERROR", "Unable to verify project access.");
  }

  const repository = await supabase
    .from("project_repositories")
    .select("id")
    .eq("id", repositoryId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (repository.error) return error(500, "INTERNAL_ERROR", "Unable to verify repository access.");
  if (!repository.data) return error(404, "NOT_FOUND", "Repository not found.");

  try {
    const detail = await loadPullRequestDetail(pullRequestId, {
      findPullRequest: async id => {
        const result = await supabase.from("repository_pull_requests").select("*").eq("id", id).eq("repository_id", repositoryId).maybeSingle();
        if (result.error) throw new Error(result.error.message);
        return result.data;
      },
      listReviews: async id => {
        const result = await supabase.from("repository_pull_request_reviews").select("*").eq("pull_request_id", id).order("submitted_at", { ascending: false, nullsFirst: false });
        if (result.error) throw new Error(result.error.message);
        return result.data ?? [];
      },
    });
    if (!detail) return error(404, "NOT_FOUND", "Pull Request not found.");
    return Response.json({ data: detail }, { headers: noStore });
  } catch {
    return error(500, "DETAIL_UNAVAILABLE", "Pull Request details are temporarily unavailable.");
  }
}

import { z } from "zod";
import { buildTimelineEvents } from "@/lib/github/timeline";
import { authorizeProjectAccess, ProjectAccessError } from "@/lib/projects/authorization";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const pagination = z.object({
  page: z.coerce.number().int().min(0).max(100).default(0),
  limit: z.coerce.number().int().min(5).max(25).default(12),
});

const noStore = { "Cache-Control": "private, no-store" };

function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: noStore });
}

type RouteContext = { params: Promise<{ projectId: string; repositoryId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { projectId, repositoryId } = await params;
  const parsed = pagination.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return error(400, "INVALID_REQUEST", "Invalid timeline pagination.");

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

  const repositoryResult = await supabase
    .from("project_repositories")
    .select("*")
    .eq("id", repositoryId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (repositoryResult.error) return error(500, "INTERNAL_ERROR", "Unable to load the repository.");
  if (!repositoryResult.data) return error(404, "NOT_FOUND", "Repository not found.");

  const { page, limit } = parsed.data;
  const from = page * limit;
  const to = from + limit;
  const [commits, pullRequests, reviews, activities] = await Promise.all([
    supabase.from("repository_commits").select("*").eq("repository_id", repositoryId).order("committed_at", { ascending: false, nullsFirst: false }).range(from, to),
    supabase.from("repository_pull_requests").select("*").eq("repository_id", repositoryId).order("updated_at", { ascending: false }).range(from, to),
    supabase.from("repository_pull_request_reviews").select("*,repository_pull_requests!inner(id,repository_id,pull_request_number,title)").eq("repository_pull_requests.repository_id", repositoryId).order("created_at", { ascending: false }).range(from, to),
    supabase.from("project_activity_logs").select("*").eq("project_id", projectId).eq("repository_id", repositoryId).order("occurred_at", { ascending: false }).range(from, to),
  ]);
  const queryError = commits.error || pullRequests.error || reviews.error || activities.error;
  if (queryError) return error(500, "TIMELINE_UNAVAILABLE", "Repository timeline is temporarily unavailable.");

  const reviewRows = (reviews.data ?? []).slice(0, limit).map(review => ({
    ...review,
    pullRequest: review.repository_pull_requests,
  }));
  const events = buildTimelineEvents({
    commits: (commits.data ?? []).slice(0, limit),
    pullRequests: (pullRequests.data ?? []).slice(0, limit),
    reviews: reviewRows,
    syncLogs: [],
    webhookDeliveries: [],
    activities: (activities.data ?? []).slice(0, limit),
  });
  const hasMore = [commits.data, pullRequests.data, reviews.data, activities.data]
    .some(items => (items?.length ?? 0) > limit);

  return Response.json({
    data: {
      repository: repositoryResult.data,
      events,
      pagination: { page, hasMore },
    },
  }, { headers: noStore });
}

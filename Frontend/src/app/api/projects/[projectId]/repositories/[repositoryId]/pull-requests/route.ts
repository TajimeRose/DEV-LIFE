import {
  paginationData,
  parsePullRequestListQuery,
  postgrestContainsPattern,
} from "@/lib/github/repository-read-query";
import { authorizeRepositoryRead, privateNoStore, repositoryReadError } from "@/lib/github/repository-read-route";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ projectId: string; repositoryId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const parsed = parsePullRequestListQuery(new URL(request.url));
  if (!parsed.success) return repositoryReadError(400, "INVALID_REQUEST", "Invalid Pull Request filters or pagination.");

  const { projectId, repositoryId } = await params;
  const access = await authorizeRepositoryRead(projectId, repositoryId);
  if (!access.ok) return access.response;

  const { page, limit, search, state } = parsed.data;
  let query = access.supabase
    .from("repository_pull_requests")
    .select("id,pull_request_number,title,description,state,source_branch,target_branch,head_sha,author_github_login,author_avatar_url,github_created_at,github_updated_at,closed_at,merged_at,merged_by_github_login,github_url,is_draft,is_mergeable,has_conflicts,review_status,reviews_count,comments_count,commits_count,additions,deletions,changed_files_count,updated_at", { count: "exact" })
    .eq("repository_id", repositoryId);
  if (state === "merged") query = query.not("merged_at", "is", null);
  if (state === "open") query = query.eq("state", "open");
  if (state === "closed") query = query.eq("state", "closed").is("merged_at", null);
  if (search) {
    const pattern = postgrestContainsPattern(search);
    const numberFilter = /^\d+$/.test(search) ? `,pull_request_number.eq.${search}` : "";
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern},author_github_login.ilike.${pattern}${numberFilter}`);
  }

  const offset = (page - 1) * limit;
  const [pullRequestsResult, reviewsResult] = await Promise.all([
    query
      .order("github_updated_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1),
    access.supabase
      .from("repository_pull_request_reviews")
      .select("id,repository_pull_requests!inner(repository_id)", { count: "exact", head: true })
      .eq("repository_pull_requests.repository_id", repositoryId),
  ]);
  if (pullRequestsResult.error) return repositoryReadError(500, "PULL_REQUESTS_UNAVAILABLE", "Repository Pull Requests are temporarily unavailable.");
  if (reviewsResult.error) return repositoryReadError(500, "PULL_REQUESTS_UNAVAILABLE", "Repository Pull Requests are temporarily unavailable.");

  const numbers = (pullRequestsResult.data ?? []).map(pullRequest => pullRequest.pull_request_number);
  const tasksResult = numbers.length === 0
    ? { data: [], error: null }
    : await access.supabase
        .from("tasks")
        .select("id,title,status,priority,task_type,assignee_id,linked_pull_request_number")
        .eq("project_id", projectId)
        .eq("repository_id", repositoryId)
        .in("linked_pull_request_number", numbers);
  if (tasksResult.error) return repositoryReadError(500, "PULL_REQUESTS_UNAVAILABLE", "Repository Pull Requests are temporarily unavailable.");

  const tasksByNumber = new Map<number, typeof tasksResult.data>();
  for (const task of tasksResult.data ?? []) {
    if (task.linked_pull_request_number === null) continue;
    tasksByNumber.set(task.linked_pull_request_number, [...(tasksByNumber.get(task.linked_pull_request_number) ?? []), task]);
  }
  const pullRequests = (pullRequestsResult.data ?? []).map(pullRequest => ({
    ...pullRequest,
    linkedTasks: tasksByNumber.get(pullRequest.pull_request_number) ?? [],
  }));
  const total = pullRequestsResult.count ?? 0;

  return Response.json({
    data: {
      pullRequests,
      synchronizedReviewTotal: reviewsResult.count ?? 0,
      pagination: paginationData(page, limit, total),
    },
  }, { headers: privateNoStore });
}

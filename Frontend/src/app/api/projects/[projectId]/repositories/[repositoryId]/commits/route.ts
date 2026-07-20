import {
  paginationData,
  parseCommitListQuery,
  postgrestContainsPattern,
} from "@/lib/github/repository-read-query";
import { authorizeRepositoryRead, privateNoStore, repositoryReadError } from "@/lib/github/repository-read-route";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ projectId: string; repositoryId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const parsed = parseCommitListQuery(new URL(request.url));
  if (!parsed.success) return repositoryReadError(400, "INVALID_REQUEST", "Invalid commit filters or pagination.");

  const { projectId, repositoryId } = await params;
  const access = await authorizeRepositoryRead(projectId, repositoryId);
  if (!access.ok) return access.response;

  const { page, limit, search, author, from, to } = parsed.data;
  let query = access.supabase
    .from("repository_commits")
    .select("id,sha,short_sha,message,message_body,author_name,author_email,author_github_login,author_avatar_url,committer_name,committed_at,parent_shas,github_url,verification_status,additions,deletions,files_changed", { count: "exact" })
    .eq("repository_id", repositoryId);
  if (search) {
    const pattern = postgrestContainsPattern(search);
    query = query.or(`sha.ilike.${pattern},message.ilike.${pattern},message_body.ilike.${pattern}`);
  }
  if (author) {
    const pattern = postgrestContainsPattern(author);
    query = query.or(`author_name.ilike.${pattern},author_email.ilike.${pattern},author_github_login.ilike.${pattern},committer_name.ilike.${pattern}`);
  }
  if (from) query = query.gte("committed_at", from);
  if (to) query = query.lte("committed_at", to);

  const offset = (page - 1) * limit;
  const commitsResult = await query
    .order("committed_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);
  if (commitsResult.error) return repositoryReadError(500, "COMMITS_UNAVAILABLE", "Repository commits are temporarily unavailable.");

  const shas = (commitsResult.data ?? []).map(commit => commit.sha);
  const tasksResult = shas.length === 0
    ? { data: [], error: null }
    : await access.supabase
        .from("tasks")
        .select("id,title,status,priority,task_type,assignee_id,linked_commit_sha")
        .eq("project_id", projectId)
        .eq("repository_id", repositoryId)
        .in("linked_commit_sha", shas);
  if (tasksResult.error) return repositoryReadError(500, "COMMITS_UNAVAILABLE", "Repository commits are temporarily unavailable.");

  const tasksBySha = new Map<string, typeof tasksResult.data>();
  for (const task of tasksResult.data ?? []) {
    if (!task.linked_commit_sha) continue;
    tasksBySha.set(task.linked_commit_sha, [...(tasksBySha.get(task.linked_commit_sha) ?? []), task]);
  }
  const commits = (commitsResult.data ?? []).map(commit => ({
    ...commit,
    linkedTasks: tasksBySha.get(commit.sha) ?? [],
  }));
  const total = commitsResult.count ?? 0;

  return Response.json({
    data: { commits, pagination: paginationData(page, limit, total) },
  }, { headers: privateNoStore });
}

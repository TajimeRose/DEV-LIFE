import { authorizeRepositoryRead, privateNoStore, repositoryReadError } from "@/lib/github/repository-read-route";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ projectId: string; repositoryId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { projectId, repositoryId } = await params;
  const access = await authorizeRepositoryRead(projectId, repositoryId);
  if (!access.ok) return access.response;

  const result = await access.supabase
    .from("tasks")
    .select("id,title,description,status,priority,task_type,position,board_id,assignee_id,reporter_id,branch_name,linked_commit_sha,linked_pull_request_number,github_issue_number,start_date,due_date,completed_at,created_at,updated_at", { count: "exact" })
    .eq("project_id", projectId)
    .eq("repository_id", repositoryId)
    .order("created_at", { ascending: false });
  if (result.error) return repositoryReadError(500, "TASKS_UNAVAILABLE", "Repository tasks are temporarily unavailable.");

  return Response.json({ data: { tasks: result.data, total: result.count ?? 0 } }, { headers: privateNoStore });
}

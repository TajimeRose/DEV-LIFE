import { authorizeRepositoryRead, privateNoStore, repositoryReadError } from "@/lib/github/repository-read-route";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ projectId: string; repositoryId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { projectId, repositoryId } = await params;
  const access = await authorizeRepositoryRead(projectId, repositoryId);
  if (!access.ok) return access.response;

  const result = await access.supabase
    .from("repository_branches")
    .select("id,branch_name,is_default,is_protected,latest_commit_sha,github_url,updated_at", { count: "exact" })
    .eq("repository_id", repositoryId)
    .order("is_default", { ascending: false })
    .order("branch_name", { ascending: true });
  if (result.error) return repositoryReadError(500, "BRANCHES_UNAVAILABLE", "Repository branches are temporarily unavailable.");

  return Response.json({ data: { branches: result.data, total: result.count ?? 0 } }, { headers: privateNoStore });
}

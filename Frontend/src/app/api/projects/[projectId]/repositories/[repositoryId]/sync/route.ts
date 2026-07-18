import { GitHubClientError } from "@/lib/github/client";
import { insertRepositoryActivity } from "@/lib/github/project-activity";
import { fetchGitHubRepositorySnapshot } from "@/lib/github/sync-client";
import { buildRepositorySyncRecords } from "@/lib/github/sync-records";
import { readGitHubToken } from "@/lib/github/token-vault";
import { authorizeProjectAccess, ProjectAccessError } from "@/lib/projects/authorization";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store" };

function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: noStore });
}

type RouteContext = { params: Promise<{ projectId: string; repositoryId: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const { projectId, repositoryId } = await params;
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

  const token = await readGitHubToken(claims.claims.sub);
  if (!token) return error(401, "GITHUB_NOT_CONNECTED", "Reconnect GitHub before synchronizing.");

  const syncLogId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const start = await supabase.from("repository_sync_logs").insert({
    id: syncLogId,
    repository_id: repositoryId,
    sync_type: "manual",
    status: "started",
    started_at: startedAt,
  });
  if (start.error) return error(500, "SYNC_UNAVAILABLE", "Unable to start repository synchronization.");
  await supabase.from("project_repositories").update({
    sync_status: "syncing",
    sync_error: null,
  }).eq("id", repositoryId).eq("project_id", projectId);

  try {
    const snapshot = await fetchGitHubRepositorySnapshot(
      token,
      repositoryResult.data.github_owner,
      repositoryResult.data.github_name,
    );
    const records = await buildRepositorySyncRecords(
      repositoryId,
      repositoryResult.data.default_branch,
      snapshot,
    );
    const writes = [];
    if (records.branches.length) writes.push(supabase.from("repository_branches").upsert(records.branches));
    if (records.commits.length) writes.push(supabase.from("repository_commits").upsert(records.commits));
    if (records.pullRequests.length) writes.push(supabase.from("repository_pull_requests").upsert(records.pullRequests));
    if (records.reviews.length) writes.push(supabase.from("repository_pull_request_reviews").upsert(records.reviews));
    const results = await Promise.all(writes);
    const writeError = results.find(result => result.error)?.error;
    if (writeError) throw new Error(writeError.message);

    await Promise.all([
      ...records.commits.map(commit => insertRepositoryActivity(supabase, {
        idempotencyKey: `commit-synchronized:${commit.sha}`,
        project_id: projectId,
        repository_id: repositoryId,
        actor_github_login: commit.author_github_login,
        action_type: "commit_synchronized",
        entity_type: "commit",
        entity_id: commit.sha,
        title: `Commit synchronized: ${commit.message}`,
        commit_sha: commit.sha,
        occurred_at: commit.committed_at ?? startedAt,
        metadata: {},
      })),
      ...records.pullRequests.map(pullRequest => insertRepositoryActivity(supabase, {
        idempotencyKey: `pull-request:${pullRequest.github_pull_request_id}:${pullRequest.merged_at ? "merged" : "opened"}`,
        project_id: projectId,
        repository_id: repositoryId,
        actor_github_login: pullRequest.author_github_login,
        action_type: pullRequest.merged_at ? "pull_request_merged" : "pull_request_opened",
        entity_type: "pull_request",
        entity_id: String(pullRequest.github_pull_request_id),
        title: `${pullRequest.merged_at ? "Pull Request merged" : "Pull Request synchronized"}: #${pullRequest.pull_request_number} ${pullRequest.title}`,
        pull_request_number: pullRequest.pull_request_number,
        occurred_at: pullRequest.merged_at ?? pullRequest.github_created_at ?? startedAt,
        metadata: {},
      })),
      ...records.reviews.map(review => insertRepositoryActivity(supabase, {
        idempotencyKey: `review:${review.github_review_id}`,
        project_id: projectId,
        repository_id: repositoryId,
        actor_github_login: review.reviewer_github_login,
        action_type: "pull_request_review_submitted",
        entity_type: "pull_request_review",
        entity_id: String(review.github_review_id),
        title: `Pull Request review submitted: ${review.review_state}`,
        occurred_at: review.submitted_at ?? startedAt,
        metadata: {},
      })),
    ]);

    const completedAt = new Date().toISOString();
    const [syncUpdate, repositoryUpdate] = await Promise.all([
      supabase.from("repository_sync_logs").update({
        status: "success",
        completed_at: completedAt,
        branches_processed: records.branches.length,
        commits_processed: records.commits.length,
        pull_requests_processed: records.pullRequests.length,
        error_message: null,
      }).eq("id", syncLogId).eq("repository_id", repositoryId),
      supabase.from("project_repositories").update({
        sync_status: "success",
        last_synced_at: completedAt,
        sync_error: null,
      }).eq("id", repositoryId).eq("project_id", projectId),
    ]);
    if (syncUpdate.error || repositoryUpdate.error) throw new Error("Unable to finalize synchronization.");
    await insertRepositoryActivity(supabase, {
      idempotencyKey: `sync-completed:${syncLogId}`,
      project_id: projectId,
      repository_id: repositoryId,
      actor_user_id: claims.claims.sub,
      action_type: "repository_sync_completed",
      entity_type: "repository_sync",
      entity_id: syncLogId,
      title: `Repository synchronization completed: ${repositoryResult.data.github_full_name}`,
      occurred_at: completedAt,
      metadata: {
        branches_processed: records.branches.length,
        commits_processed: records.commits.length,
        pull_requests_processed: records.pullRequests.length,
      },
    });
    return Response.json({
      data: {
        syncLogId,
        status: "success",
        branchesProcessed: records.branches.length,
        commitsProcessed: records.commits.length,
        pullRequestsProcessed: records.pullRequests.length,
      },
    }, { headers: noStore });
  } catch (cause) {
    const completedAt = new Date().toISOString();
    const message = cause instanceof GitHubClientError
      ? "GitHub synchronization failed."
      : "Repository synchronization failed.";
    await Promise.allSettled([
      supabase.from("repository_sync_logs").update({
        status: "failed",
        completed_at: completedAt,
        error_message: message,
      }).eq("id", syncLogId).eq("repository_id", repositoryId),
      supabase.from("project_repositories").update({
        sync_status: "failed",
        sync_error: message,
      }).eq("id", repositoryId).eq("project_id", projectId),
      insertRepositoryActivity(supabase, {
        idempotencyKey: `sync-failed:${syncLogId}`,
        project_id: projectId,
        repository_id: repositoryId,
        actor_user_id: claims.claims.sub,
        action_type: "repository_sync_failed",
        entity_type: "repository_sync",
        entity_id: syncLogId,
        title: `Repository synchronization failed: ${repositoryResult.data.github_full_name}`,
        description: message,
        occurred_at: completedAt,
        metadata: {},
      }),
    ]);
    return error(502, "SYNC_FAILED", message);
  }
}

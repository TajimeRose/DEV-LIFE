import { getGitHubRepository } from "@/lib/github/client";
import { githubPrivateReposEnabled } from "@/lib/github/config";
import { insertRepositoryActivity } from "@/lib/github/project-activity";
import {
  handleProjectRepositoriesGet,
  handleProjectRepositoriesPost,
  type RepositoryConnectionDependencies,
} from "@/lib/github/repository-connections-handler";
import { stableUuid } from "@/lib/github/stable-id";
import { readGitHubToken } from "@/lib/github/token-vault";
import { authorizeProjectAccess } from "@/lib/projects/authorization";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function dependencies(): RepositoryConnectionDependencies {
  const context = (async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    return {
      supabase,
      userId: error || !data?.claims.sub ? null : data.claims.sub,
    };
  })();

  return {
    authenticate: async () => {
      const { userId } = await context;
      return userId ? { userId } : null;
    },
    authorize: async (projectId, userId) => {
      const { supabase } = await context;
      await authorizeProjectAccess(supabase, userId, projectId);
    },
    list: async projectId => {
      const { supabase } = await context;
      const { data, error } = await supabase
        .from("project_repositories")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
    findDuplicate: async (projectId, githubRepositoryId) => {
      const { supabase } = await context;
      const { data, error } = await supabase
        .from("project_repositories")
        .select("*")
        .eq("project_id", projectId)
        .eq("github_repository_id", githubRepositoryId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    readGitHubRepository: async (userId, githubRepositoryId) => {
      const token = await readGitHubToken(userId);
      if (!token) return null;
      return getGitHubRepository(token, githubRepositoryId, githubPrivateReposEnabled());
    },
    insert: async (projectId, userId, repository) => {
      const { supabase } = await context;
      const id = await stableUuid("project-repository", `${projectId}:${repository.id}`);
      const { data, error } = await supabase
        .from("project_repositories")
        .insert({
          id,
          project_id: projectId,
          connected_by: userId,
          github_repository_id: repository.id,
          github_owner: repository.ownerLogin,
          github_name: repository.name,
          github_full_name: repository.fullName,
          github_url: repository.htmlUrl,
          default_branch: repository.defaultBranch,
          visibility: repository.visibility,
          is_private: repository.private,
          is_archived: repository.archived,
          sync_status: "idle",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    recordConnection: async (projectId, userId, repository) => {
      const { supabase } = await context;
      await insertRepositoryActivity(supabase, {
        idempotencyKey: `repository-connected:${repository.id}`,
        project_id: projectId,
        repository_id: repository.id,
        actor_user_id: userId,
        action_type: "repository_connected",
        entity_type: "repository",
        entity_id: repository.id,
        title: `Repository connected: ${repository.github_full_name}`,
        metadata: { github_repository_id: repository.github_repository_id },
      });
    },
  };
}

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  return handleProjectRepositoriesGet((await params).projectId, dependencies());
}

export async function POST(request: Request, { params }: RouteContext) {
  return handleProjectRepositoriesPost(request, (await params).projectId, dependencies());
}

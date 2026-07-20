import type { Tables } from "@/lib/database.types";
import { authorizeProjectAccess, ProjectAccessError } from "@/lib/projects/authorization";
import { createClient } from "@/lib/supabase/server";

export const privateNoStore = { "Cache-Control": "private, no-store" };

export function repositoryReadError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: privateNoStore });
}

export async function authorizeRepositoryRead(projectId: string, repositoryId: string) {
  const supabase = await createClient();
  const { data: claims, error: authError } = await supabase.auth.getClaims();
  if (authError || !claims?.claims.sub) {
    return {
      ok: false as const,
      response: repositoryReadError(401, "UNAUTHENTICATED", "Please sign in to continue."),
    };
  }

  try {
    await authorizeProjectAccess(supabase, claims.claims.sub, projectId);
  } catch (cause) {
    if (cause instanceof ProjectAccessError) {
      return {
        ok: false as const,
        response: repositoryReadError(cause.status, "UNAUTHORIZED", "You do not have access to this project."),
      };
    }
    return {
      ok: false as const,
      response: repositoryReadError(500, "INTERNAL_ERROR", "Unable to verify project access."),
    };
  }

  const result = await supabase
    .from("project_repositories")
    .select("*")
    .eq("id", repositoryId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (result.error) {
    return {
      ok: false as const,
      response: repositoryReadError(500, "INTERNAL_ERROR", "Unable to verify repository access."),
    };
  }
  if (!result.data) {
    return {
      ok: false as const,
      response: repositoryReadError(404, "NOT_FOUND", "Repository not found."),
    };
  }

  return {
    ok: true as const,
    supabase,
    repository: result.data satisfies Tables<"project_repositories">,
    userId: claims.claims.sub,
  };
}

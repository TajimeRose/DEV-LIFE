import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/database.types";

type ProjectIdentity = Pick<Tables<"projects">, "id" | "user_id">;
type MembershipIdentity = Pick<Tables<"project_members">, "id" | "role">;

export type ProjectAccess = {
  project: ProjectIdentity;
  role: "owner" | string;
};

export class ProjectAccessError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.status = status;
  }
}

export type ProjectAccessDependencies = {
  findProject: (projectId: string) => Promise<ProjectIdentity | null>;
  findMembership: (projectId: string, userId: string) => Promise<MembershipIdentity | null>;
};

export async function verifyProjectAccess(
  projectId: string,
  userId: string | null,
  dependencies: ProjectAccessDependencies,
): Promise<ProjectAccess> {
  if (!userId) throw new ProjectAccessError(401, "Authentication required");

  const project = await dependencies.findProject(projectId);
  if (!project) throw new ProjectAccessError(403, "Project access denied");
  if (project.user_id === userId) return { project, role: "owner" };

  const membership = await dependencies.findMembership(projectId, userId);
  if (!membership) throw new ProjectAccessError(403, "Project access denied");
  return { project, role: membership.role };
}

export async function authorizeProjectAccess(
  supabase: SupabaseClient<Database>,
  userId: string | null,
  projectId: string,
) {
  return verifyProjectAccess(projectId, userId, {
    findProject: async id => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,user_id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    findMembership: async (id, memberUserId) => {
      const { data, error } = await supabase
        .from("project_members")
        .select("id,role")
        .eq("project_id", id)
        .eq("user_id", memberUserId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getCurrentWorkspace = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { supabase, user: null, project: null };
  const { data: project, error } = await supabase.from("projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return { supabase, user, project };
});

type WorkspaceSelection = {
  tasks?: boolean;
  notes?: boolean;
  activities?: boolean;
};

export async function getProjectWorkspace(selection: WorkspaceSelection = {}) {
  const { supabase, project } = await getCurrentWorkspace();
  if (!project) return { project: null, tasks: [], notes: [], activities: [] };
  const [taskResult, noteResult, activityResult] = await Promise.all([
    selection.tasks ? supabase.from("tasks").select("*").eq("project_id", project.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    selection.notes ? supabase.from("notes").select("*").eq("project_id", project.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    selection.activities ? supabase.from("activities").select("*").eq("project_id", project.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
  ]);
  const error = taskResult.error || noteResult.error || activityResult.error;
  if (error) throw new Error(error.message);
  return { project, tasks: taskResult.data ?? [], notes: noteResult.data ?? [], activities: activityResult.data ?? [] };
}

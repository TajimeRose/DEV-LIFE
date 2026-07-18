import { redirect } from "next/navigation";
import { ProjectSelector } from "@/components/project-selector";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  if (authError || !auth?.claims.sub) redirect("/login");
  const { claims } = auth;
  const [ownedResult, membershipResult] = await Promise.all([
    supabase.from("projects").select("id,name,created_at").eq("user_id", claims.sub).order("created_at", { ascending: false }),
    supabase.from("project_members").select("project_id").eq("user_id", claims.sub),
  ]);
  if (ownedResult.error) throw new Error(ownedResult.error.message);
  if (membershipResult.error) throw new Error(membershipResult.error.message);
  const memberProjectIds = [...new Set((membershipResult.data ?? []).map(item => item.project_id))];
  const memberResult = memberProjectIds.length
    ? await supabase.from("projects").select("id,name,created_at").in("id", memberProjectIds).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (memberResult.error) throw new Error(memberResult.error.message);
  const projects = [...(ownedResult.data ?? []), ...(memberResult.data ?? [])]
    .filter((project, index, items) => items.findIndex(item => item.id === project.id) === index)
    .sort((left, right) => new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime());
  const metadata = claims.user_metadata ?? {};
  const displayName =
    typeof metadata.display_name === "string" ? metadata.display_name :
    typeof metadata.user_name === "string" ? metadata.user_name :
    claims.email?.split("@")[0] ?? "USER";
  return <ProjectSelector projects={projects} displayName={displayName} />;
}

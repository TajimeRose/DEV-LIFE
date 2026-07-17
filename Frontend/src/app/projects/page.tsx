import { redirect } from "next/navigation";
import { ProjectSelector } from "@/components/project-selector";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  if (authError || !auth?.claims.sub) redirect("/login");
  const { claims } = auth;
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id,name,created_at")
    .eq("user_id", claims.sub)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const metadata = claims.user_metadata ?? {};
  const displayName =
    typeof metadata.display_name === "string" ? metadata.display_name :
    typeof metadata.user_name === "string" ? metadata.user_name :
    claims.email?.split("@")[0] ?? "USER";
  return <ProjectSelector projects={projects ?? []} displayName={displayName} />;
}

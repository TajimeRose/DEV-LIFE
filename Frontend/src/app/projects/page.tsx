import { redirect } from "next/navigation";
import { ProjectSelector } from "@/components/project-selector";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: projects, error } = await supabase.from("projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const displayName = typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : user.email?.split("@")[0] ?? "USER";
  return <ProjectSelector projects={projects ?? []} displayName={displayName} />;
}

import { TeamManagement } from "@/components/team/TeamManagement";
import { PageHeader } from "@/components/ui";
import { getCurrentWorkspace } from "@/lib/current-workspace";

export default async function Page() {
  const { supabase, project, role } = await getCurrentWorkspace();
  const canManage = role === "owner";
  const [membersResult, invitationsResult] = await Promise.all([
    supabase.from("project_members").select("*").eq("project_id", project!.id).order("created_at"),
    canManage ? supabase.from("project_invitations").select("id,project_id,invited_by,invited_email,role,status,created_at,expires_at").eq("project_id", project!.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
  ]);
  if (membersResult.error || invitationsResult.error) throw new Error("โหลดข้อมูลทีมไม่สำเร็จ");
  return <><PageHeader eyebrow="ทีม" title="พื้นที่ทำงานร่วมกัน" description="เชิญสมาชิกและกำหนดสิทธิ์สำหรับโน้ต งาน และแผนผัง" /><TeamManagement projectId={project!.id} projectName={project!.name} ownerId={project!.user_id ?? ""} role={role ?? "viewer"} members={membersResult.data ?? []} invitations={invitationsResult.data ?? []} /></>;
}

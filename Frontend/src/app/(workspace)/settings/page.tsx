import { ProfileSettings } from "@/components/profile-settings";
import { getCurrentWorkspace } from "@/lib/current-workspace";

export default async function Page() {
  const { user, project } = await getCurrentWorkspace();
  const displayName = typeof user?.user_metadata.display_name === "string" ? user.user_metadata.display_name : "";
  return <><div className="heading"><div><small>การตั้งค่า</small><h1>บัญชีและโปรเจกต์</h1><p>จัดการข้อมูลบัญชี โปรเจกต์ปัจจุบัน และการเข้าสู่ระบบ</p></div></div><ProfileSettings displayName={displayName} email={user?.email} projectId={project!.id} projectName={project!.name} /></>;
}

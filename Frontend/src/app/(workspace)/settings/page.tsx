import { ProfileSettings } from "@/components/profile-settings";
import { getCurrentWorkspace } from "@/lib/current-workspace";

export default async function Page() {
  const { user, project } = await getCurrentWorkspace();
  const displayName = typeof user?.user_metadata.display_name === "string" ? user.user_metadata.display_name : "";
  return <><div className="heading"><div><small>SETTINGS</small><h1>การตั้งค่า</h1><p>จัดการบัญชี โปรเจกต์ และการเข้าสู่ระบบ</p></div></div><ProfileSettings displayName={displayName} email={user?.email} projectId={project!.id} projectName={project!.name} /></>;
}

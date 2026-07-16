import { ProfileSettings } from "@/components/profile-settings";
import { getCurrentWorkspace } from "@/lib/current-workspace";

export default async function Page() {
  const { user } = await getCurrentWorkspace();
  const displayName = typeof user?.user_metadata.display_name === "string" ? user.user_metadata.display_name : "";
  return <><div className="heading"><div><small>ACCOUNT</small><h1>ตั้งค่าบัญชี</h1><p>แก้ไขชื่อที่แสดงบน Dashboard และเมนูบัญชี</p></div></div><ProfileSettings displayName={displayName} email={user?.email} /></>;
}

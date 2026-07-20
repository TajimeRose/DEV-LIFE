import Link from "next/link";
import { InvitationAcceptance } from "@/components/team/InvitationAcceptance";
import { Badge, Card } from "@/components/ui";
import { roleLabel } from "@/lib/projects/permissions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const path = `/invitations/${token}`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="invitation-page"><Card className="invitation-card"><Badge tone="brand">คำเชิญเข้าร่วมทีม</Badge><h1>เข้าสู่ระบบเพื่อดูคำเชิญ</h1><p>คำเชิญผูกกับอีเมลผู้รับ กรุณาใช้บัญชีที่ได้รับเชิญ</p><div className="invitation-actions"><Link className="ui-button ui-button-primary" href={`/login?next=${encodeURIComponent(path)}`}>เข้าสู่ระบบ</Link><Link className="ui-button ui-button-secondary" href={`/register?next=${encodeURIComponent(path)}`}>สร้างบัญชี</Link></div></Card></main>;

  const { data: invitation } = await supabase.from("project_invitations").select("id,project_id,invited_email,role,status,expires_at,projects(name)").eq("token", token).maybeSingle();
  const valid = invitation?.status === "pending" && invitation.expires_at !== null;
  if (!invitation || !valid) return <main className="invitation-page"><Card className="invitation-card"><h1>ไม่พบคำเชิญ</h1><p>ลิงก์อาจไม่ถูกต้อง ถูกใช้แล้ว หรือหมดอายุ</p><Link href="/projects">กลับหน้าโปรเจกต์</Link></Card></main>;
  const project = Array.isArray(invitation.projects) ? invitation.projects[0] : invitation.projects;
  return <main className="invitation-page"><Card className="invitation-card"><Badge tone="brand">คำเชิญเข้าร่วมทีม</Badge><h1>{project?.name ?? "โปรเจกต์ร่วมทีม"}</h1><p>คุณได้รับเชิญเป็น <b>{roleLabel(invitation.role)}</b> ด้วยอีเมล {invitation.invited_email}</p><dl><div><dt>สิทธิ์</dt><dd>{roleLabel(invitation.role)}</dd></div><div><dt>หมดอายุ</dt><dd>{new Date(invitation.expires_at!).toLocaleString("th-TH")}</dd></div></dl><InvitationAcceptance token={token} /></Card></main>;
}

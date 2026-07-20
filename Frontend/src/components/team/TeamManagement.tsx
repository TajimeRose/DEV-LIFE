"use client";

import { useActionState, useState, useTransition } from "react";
import { inviteProjectMember, removeProjectMember, revokeProjectInvitation, updateProjectMemberRole } from "@/app/actions/team";
import { Badge, Button, Card, FormField, Input, Select, useToast } from "@/components/ui";
import type { Tables } from "@/lib/database.types";
import { roleLabel } from "@/lib/projects/permissions";
import { useProjectRealtime } from "@/lib/realtime/use-project-realtime";

type Member = Tables<"project_members">;
type Invitation = Omit<Tables<"project_invitations">, "token">;

export function TeamManagement({ projectId, projectName, ownerId, role, members: initialMembers, invitations: initialInvitations }: { projectId: string; projectName: string; ownerId: string; role: string; members: Member[]; invitations: Invitation[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [state, inviteAction, inviting] = useActionState(inviteProjectMember, null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const canManage = role === "owner";

  const refreshMembers = async () => {
    const response = await fetch(`/api/projects/${projectId}/team`, { cache: "no-store" });
    if (!response.ok) return;
    const data: { members: Member[]; invitations: Invitation[] } = await response.json();
    setMembers(data.members);
    setInvitations(data.invitations);
  };
  useProjectRealtime("project_members", projectId, () => void refreshMembers());
  useProjectRealtime("project_invitations", projectId, () => void refreshMembers());

  const mutate = (action: () => Promise<void>, message: string) => startTransition(async () => {
    try {
      await action();
      await refreshMembers();
      toast(message);
    } catch (error) {
      toast(error instanceof Error ? error.message : "ทำรายการไม่สำเร็จ", "danger");
    }
  });

  return <div className="team-layout">
    <Card className="team-summary"><div><small>พื้นที่ทำงานร่วมกัน</small><h2>{projectName}</h2><p>สมาชิกเห็นโน้ต งาน และแผนผังเดียวกัน การเปลี่ยนแปลงจะแสดงแบบ Realtime</p></div><Badge tone="brand">{members.length + 1} คน</Badge></Card>
    <div className="team-grid">
      <Card className="team-panel"><header><div><h2>สมาชิก</h2><p>กำหนดสิทธิ์การอ่านและแก้ไขข้อมูลในโปรเจกต์</p></div></header><div className="team-list"><article><div className="member-avatar">O</div><div><b>เจ้าของโปรเจกต์</b><small>{ownerId === "" ? "Owner" : `ID ${ownerId.slice(0, 8)}`}</small></div><Badge tone="brand">เจ้าของ</Badge></article>{members.map(member => <article key={member.id}><div className="member-avatar">{member.user_id.slice(0, 1).toUpperCase()}</div><div><b>สมาชิก {member.user_id.slice(0, 8)}</b><small>เข้าร่วม {new Date(member.created_at).toLocaleDateString("th-TH")}</small></div>{canManage ? <><Select aria-label={`สิทธิ์ของสมาชิก ${member.user_id}`} value={member.role} disabled={pending} onChange={event => mutate(() => updateProjectMemberRole(projectId, member.id, event.target.value), "เปลี่ยนสิทธิ์แล้ว")}><option value="maintainer">ผู้ดูแล</option><option value="developer">ผู้แก้ไข</option><option value="reviewer">ผู้ตรวจสอบ</option><option value="viewer">ผู้อ่าน</option></Select><Button variant="danger" size="sm" disabled={pending} onClick={() => window.confirm("นำสมาชิกคนนี้ออกจากโปรเจกต์หรือไม่?") && mutate(() => removeProjectMember(projectId, member.id), "นำสมาชิกออกแล้ว")}>นำออก</Button></> : <Badge>{roleLabel(member.role)}</Badge>}</article>)}</div></Card>
      <div className="team-side">{canManage && <Card className="team-panel invite-panel"><header><h2>เชิญสมาชิก</h2><p>สร้างลิงก์คำเชิญที่ใช้ได้ 7 วันและผูกกับอีเมลผู้รับ</p></header><form action={inviteAction}><input type="hidden" name="projectId" value={projectId} /><FormField label="อีเมล"><Input type="email" name="email" autoComplete="email" placeholder="teammate@example.com" required /></FormField><FormField label="สิทธิ์"><Select name="role" defaultValue="developer"><option value="developer">ผู้แก้ไข</option><option value="maintainer">ผู้ดูแล</option><option value="reviewer">ผู้ตรวจสอบ</option><option value="viewer">ผู้อ่าน</option></Select></FormField>{state?.error && <p className="form-error" role="alert">{state.error}</p>}{state?.success && <p className="form-success" role="status">{state.success}</p>}{state?.inviteUrl && <div className="invite-link"><code>{state.inviteUrl}</code><Button type="button" size="sm" onClick={() => void navigator.clipboard.writeText(new URL(state.inviteUrl!, window.location.origin).toString()).then(() => toast("คัดลอกลิงก์แล้ว"))}>คัดลอก</Button></div>}<Button variant="primary" loading={inviting}>สร้างคำเชิญ</Button></form></Card>}
        {canManage && <Card className="team-panel"><header><h2>คำเชิญที่รอตอบรับ</h2></header><div className="invitation-list">{invitations.filter(item => item.status === "pending").map(invitation => <article key={invitation.id}><div><b>{invitation.invited_email}</b><small>{roleLabel(invitation.role)} · หมดอายุ {invitation.expires_at ? new Date(invitation.expires_at).toLocaleDateString("th-TH") : "ไม่ระบุ"}</small></div><Button variant="ghost" size="sm" disabled={pending} onClick={() => mutate(() => revokeProjectInvitation(projectId, invitation.id), "ยกเลิกคำเชิญแล้ว")}>ยกเลิก</Button></article>)}{!invitations.some(item => item.status === "pending") && <p className="empty-copy">ไม่มีคำเชิญที่รอตอบรับ</p>}</div></Card>}
      </div>
    </div>
  </div>;
}

"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/current-workspace";
import { authorizeProjectAccess } from "@/lib/projects/authorization";
import { invitationRoles } from "@/lib/projects/permissions";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid();
const token = z.string().regex(/^[a-f0-9]{64}$/);
const invitationInput = z.object({
  projectId: uuid,
  email: z.email().transform(value => value.trim().toLowerCase()),
  role: z.enum(invitationRoles),
});

export type TeamActionState = { error?: string; success?: string; inviteUrl?: string } | null;

async function authenticated() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
  return { supabase, user };
}

async function ownerContext(projectId: string) {
  const id = uuid.parse(projectId);
  const context = await authenticated();
  const access = await authorizeProjectAccess(context.supabase, context.user.id, id);
  if (access.role !== "owner") throw new Error("เฉพาะเจ้าของโปรเจกต์เท่านั้นที่จัดการทีมได้");
  return { ...context, projectId: id };
}

export async function inviteProjectMember(_state: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const result = invitationInput.safeParse(Object.fromEntries(formData));
  if (!result.success) return { error: "กรุณาตรวจสอบอีเมลและสิทธิ์ของสมาชิก" };

  try {
    const { supabase, user, projectId } = await ownerContext(result.data.projectId);
    if (user.email?.toLowerCase() === result.data.email) return { error: "เจ้าของโปรเจกต์เป็นสมาชิกอยู่แล้ว" };

    const invitationToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase.from("project_invitations").insert({
      project_id: projectId,
      invited_by: user.id,
      invited_email: result.data.email,
      role: result.data.role,
      token: invitationToken,
    });
    if (error?.code === "23505") return { error: "อีเมลนี้มีคำเชิญที่รอตอบรับอยู่แล้ว" };
    if (error) throw error;

    revalidatePath("/settings/team");
    return { success: "สร้างคำเชิญแล้ว ส่งลิงก์นี้ให้สมาชิก", inviteUrl: `/invitations/${invitationToken}` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "สร้างคำเชิญไม่สำเร็จ" };
  }
}

export async function revokeProjectInvitation(projectId: string, invitationId: string) {
  const { supabase } = await ownerContext(projectId);
  const { error } = await supabase.from("project_invitations").update({ status: "revoked" }).eq("id", uuid.parse(invitationId)).eq("project_id", uuid.parse(projectId)).eq("status", "pending");
  if (error) throw new Error("ยกเลิกคำเชิญไม่สำเร็จ");
  revalidatePath("/settings/team");
}

export async function updateProjectMemberRole(projectId: string, memberId: string, roleInput: string) {
  const role = z.enum(invitationRoles).parse(roleInput);
  const { supabase } = await ownerContext(projectId);
  const { error } = await supabase.from("project_members").update({ role, updated_at: new Date().toISOString() }).eq("id", uuid.parse(memberId)).eq("project_id", uuid.parse(projectId));
  if (error) throw new Error("เปลี่ยนสิทธิ์สมาชิกไม่สำเร็จ");
  revalidatePath("/settings/team");
}

export async function removeProjectMember(projectId: string, memberId: string) {
  const { supabase } = await ownerContext(projectId);
  const { error } = await supabase.from("project_members").delete().eq("id", uuid.parse(memberId)).eq("project_id", uuid.parse(projectId));
  if (error) throw new Error("นำสมาชิกออกไม่สำเร็จ");
  revalidatePath("/settings/team");
}

export async function acceptProjectInvitation(invitationToken: string): Promise<{ projectId: string }> {
  const parsedToken = token.parse(invitationToken);
  const { supabase } = await authenticated();
  const { data, error } = await supabase.rpc("accept_project_invitation", { invitation_token: parsedToken });
  if (error || !data) throw new Error("คำเชิญไม่ถูกต้อง หมดอายุ หรืออีเมลไม่ตรงกับบัญชีนี้");
  (await cookies()).set(ACTIVE_PROJECT_COOKIE, data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  return { projectId: data };
}

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authorizeProjectAccess } from "@/lib/projects/authorization";
import { createClient } from "@/lib/supabase/server";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: rawProjectId } = await params;
  const projectId = z.uuid().safeParse(rawProjectId);
  if (!projectId.success) return NextResponse.json({ error: { code: "INVALID_PROJECT", message: "โปรเจกต์ไม่ถูกต้อง" } }, { status: 400, headers });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบ" } }, { status: 401, headers });
  try {
    const access = await authorizeProjectAccess(supabase, user.id, projectId.data);
    const [members, invitations] = await Promise.all([
      supabase.from("project_members").select("*").eq("project_id", projectId.data).order("created_at"),
      access.role === "owner" ? supabase.from("project_invitations").select("id,project_id,invited_by,invited_email,role,status,created_at,expires_at").eq("project_id", projectId.data).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    ]);
    if (members.error || invitations.error) throw new Error();
    return NextResponse.json({ members: members.data ?? [], invitations: invitations.data ?? [] }, { headers });
  } catch {
    return NextResponse.json({ error: { code: "TEAM_ACCESS_DENIED", message: "ไม่สามารถโหลดข้อมูลทีมได้" } }, { status: 403, headers });
  }
}

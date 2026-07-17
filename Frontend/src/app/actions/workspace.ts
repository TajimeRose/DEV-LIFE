"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/current-workspace";

const projectId = z.uuid();
const projectName = z.string().trim().min(1).max(200);

async function authenticated() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) redirect("/login");
  return { supabase, user: { id: data.claims.sub } };
}

async function activate(id: string) {
  (await cookies()).set(ACTIVE_PROJECT_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function selectProject(formData: FormData) {
  const id = projectId.parse(formData.get("projectId"));
  const { supabase, user } = await authenticated();
  const { data, error } = await supabase.from("projects").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error || !data) throw new Error("ไม่พบโปรเจกต์นี้");
  await activate(data.id);
  redirect("/dashboard");
}

export type ProjectFormState = { error?: string; success?: string } | null;

export async function createAndSelectProject(_state: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const result = projectName.safeParse(formData.get("name"));
  if (!result.success) return { error: "กรุณากรอกชื่อโปรเจกต์ไม่เกิน 200 ตัวอักษร" };
  const { supabase, user } = await authenticated();
  const { data, error } = await supabase.from("projects").insert({ id: crypto.randomUUID(), name: result.data, status: "active", user_id: user.id }).select().single();
  if (error) return { error: error.message };
  await activate(data.id);
  redirect("/dashboard");
}

export async function renameActiveProject(_state: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const idResult = projectId.safeParse(formData.get("projectId"));
  const nameResult = projectName.safeParse(formData.get("name"));
  if (!idResult.success || !nameResult.success) return { error: "กรุณากรอกชื่อโปรเจกต์ไม่เกิน 200 ตัวอักษร" };
  const { supabase, user } = await authenticated();
  const { error } = await supabase.from("projects").update({ name: nameResult.data }).eq("id", idResult.data).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { success: "เปลี่ยนชื่อโปรเจกต์เรียบร้อยแล้ว" };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeAuthRedirect } from "@/lib/auth/redirect";
import { githubOAuthScopes } from "@/lib/github/config";
import { clearGitHubToken } from "@/lib/github/token-vault";
import { createClient } from "@/lib/supabase/server";

const credentials = z.object({ email: z.email(), password: z.string().min(6) });

const registration = credentials.extend({ confirmPassword: z.string().min(6) }).refine(({ password, confirmPassword }) => password === confirmPassword, { path: ["confirmPassword"] });

export type LoginState = { error: string } | null;
export type RegisterState = { error?: string; success?: string } | null;
export type ProfileState = { error?: string; success?: string } | null;
export type GitHubAuthState = { error: string } | null;

function callbackUrl(next = "/projects") {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = new URL("/auth/callback", `${siteUrl.replace(/\/$/, "")}/`);
  url.searchParams.set("next", safeAuthRedirect(next));
  return url.toString();
}

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const result = credentials.safeParse(Object.fromEntries(formData));
  if (!result.success) return { error: "กรุณาตรวจสอบอีเมลและรหัสผ่าน" };
  const { error } = await (await createClient()).auth.signInWithPassword(result.data);
  if (error) return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  redirect(safeAuthRedirect(formData.get("next")?.toString()));
}

export async function register(_state: RegisterState, formData: FormData): Promise<RegisterState> {
  const result = registration.safeParse(Object.fromEntries(formData));
  if (!result.success) return { error: "กรุณาตรวจสอบข้อมูลและยืนยันรหัสผ่านให้ตรงกัน" };
  const { email, password } = result.data;
  const { data, error } = await (await createClient()).auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callbackUrl(formData.get("next")?.toString()) },
  });
  if (error) return { error: "ไม่สามารถสมัครสมาชิกได้ กรุณาตรวจสอบข้อมูลหรือลองใหม่อีกครั้ง" };
  if (data.session) redirect(safeAuthRedirect(formData.get("next")?.toString()));
  return { success: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ" };
}

async function startGitHubOAuth(next: string) {
  const scopes = githubOAuthScopes();
  const { data, error } = await (await createClient()).auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: callbackUrl(next),
      queryParams: { prompt: "select_account" },
      ...(scopes ? { scopes } : {}),
    },
  });
  if (error || !data.url) return null;
  redirect(data.url);
}

export async function signInWithGitHub(_state: GitHubAuthState, formData: FormData): Promise<GitHubAuthState> {
  void _state;
  const result = await startGitHubOAuth(safeAuthRedirect(formData.get("next")?.toString()));
  if (result === null) return { error: "ไม่สามารถเชื่อมต่อ GitHub ได้ กรุณาลองใหม่อีกครั้ง" };
  return null;
}

export async function connectGitHub() {
  const result = await startGitHubOAuth("/settings/integrations");
  if (result === null) redirect("/settings/integrations?github=error");
}

export async function disconnectGitHub() {
  const { data, error } = await (await createClient()).auth.getClaims();
  if (error || !data?.claims.sub) redirect("/login");
  await clearGitHubToken();
  revalidatePath("/settings/integrations");
  redirect("/settings/integrations?github=disconnected");
}

export async function updateProfile(_state: ProfileState, formData: FormData): Promise<ProfileState> {
  const result = z.object({ displayName: z.string().trim().min(1).max(80) }).safeParse(Object.fromEntries(formData));
  if (!result.success) return { error: "กรุณากรอกชื่อไม่เกิน 80 ตัวอักษร" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  const { error } = await supabase.auth.updateUser({ data: { display_name: result.data.displayName } });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { success: "บันทึกชื่อเรียบร้อยแล้ว" };
}

export async function logout() {
  await clearGitHubToken();
  const { error } = await (await createClient()).auth.signOut();
  if (error) throw new Error(error.message);
  redirect("/login");
}

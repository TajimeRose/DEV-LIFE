"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentials = z.object({ email: z.email(), password: z.string().min(6) });

const registration = credentials.extend({ confirmPassword: z.string().min(6) }).refine(({ password, confirmPassword }) => password === confirmPassword, { path: ["confirmPassword"] });

export type LoginState = { error: string } | null;
export type RegisterState = { error?: string; success?: string } | null;

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const result = credentials.safeParse(Object.fromEntries(formData));
  if (!result.success) return { error: "กรุณาตรวจสอบอีเมลและรหัสผ่าน" };
  const { error } = await (await createClient()).auth.signInWithPassword(result.data);
  if (error) return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  redirect("/dashboard");
}

export async function register(_state: RegisterState, formData: FormData): Promise<RegisterState> {
  const result = registration.safeParse(Object.fromEntries(formData));
  if (!result.success) return { error: "กรุณาตรวจสอบข้อมูลและยืนยันรหัสผ่านให้ตรงกัน" };
  const { email, password } = result.data;
  const { data, error } = await (await createClient()).auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback` },
  });
  if (error) return { error: "ไม่สามารถสมัครสมาชิกได้ กรุณาตรวจสอบข้อมูลหรือลองใหม่อีกครั้ง" };
  if (data.session) redirect("/dashboard");
  return { success: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ" };
}

export async function logout() {
  const { error } = await (await createClient()).auth.signOut();
  if (error) throw new Error(error.message);
  redirect("/login");
}

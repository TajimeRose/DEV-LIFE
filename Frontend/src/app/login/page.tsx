"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login } from "@/app/auth/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="auth-submit" type="submit" disabled={pending}>
      <span>{pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ Workspace"}</span>
      {!pending && <span aria-hidden="true">→</span>}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(login, null);

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <div className="auth-brand">
          <span>DL</span>
          <b>DEV LIFE</b>
        </div>
        <div className="auth-message">
          <small>DEVELOPER WORKSPACE</small>
          <h1>ทุกบริบทของโปรเจกต์ อยู่ในพื้นที่เดียว</h1>
          <p>จัดการ notes, tasks และ development flow ให้ต่อเนื่อง พร้อมกลับมาทำงานต่อได้ทันที</p>
          <div className="auth-preview" aria-hidden="true">
            <div><span>PROJECT STATUS</span><b>DEV-LIFE Workspace</b><small>Active development</small></div>
            <ul><li><i>✓</i><span><b>Project context</b><small>Notes และ tasks เชื่อมถึงกัน</small></span></li><li><i>⌘</i><span><b>Focused workflow</b><small>วางแผนและลงมือในที่เดียว</small></span></li><li><i>↗</i><span><b>Progress visibility</b><small>ติดตามสิ่งสำคัญได้ชัดเจน</small></span></li></ul>
          </div>
        </div>
        <p className="auth-story-footer">Built for developers who value clarity.</p>
      </section>

      <section className="auth-entry">
        <div className="auth-card">
          <div className="auth-mobile-brand"><span>DL</span><b>DEV LIFE</b></div>
          <small className="auth-eyebrow">WELCOME BACK</small>
          <h2>เข้าสู่ระบบ</h2>
          <p className="auth-description">กรอกข้อมูลเพื่อกลับเข้าสู่ DEV LIFE workspace ของคุณ</p>
          <form className="auth-form" action={formAction}>
            {state?.error && <p className="auth-error" role="alert">{state.error}</p>}
            <label htmlFor="email">อีเมล</label>
            <div className="auth-control"><span aria-hidden="true">@</span><input id="email" name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></div>
            <div className="auth-label-row"><label htmlFor="password">รหัสผ่าน</label><small>อย่างน้อย 6 ตัวอักษร</small></div>
            <div className="auth-control"><span aria-hidden="true">••</span><input id="password" name="password" type="password" autoComplete="current-password" placeholder="กรอกรหัสผ่าน" minLength={6} required /></div>
            <SubmitButton />
          </form>
          <p className="auth-switch">ยังไม่มีบัญชี? <Link href="/register">สมัครสมาชิกฟรี</Link></p>
          <div className="auth-secure"><span aria-hidden="true">◇</span><p><b>Secure authentication</b><small>บัญชีและ session ของคุณได้รับการจัดการผ่าน Supabase Auth</small></p></div>
        </div>
        <p className="auth-copyright">© 2026 DEV LIFE · Developer productivity workspace</p>
      </section>
    </main>
  );
}

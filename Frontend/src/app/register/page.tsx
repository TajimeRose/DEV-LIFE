"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { register } from "@/app/auth/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="auth-submit" type="submit" disabled={pending}>
      <span>{pending ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}</span>
      {!pending && <span aria-hidden="true">→</span>}
    </button>
  );
}

export default function RegisterPage() {
  const [state, formAction] = useActionState(register, null);

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <div className="auth-brand"><span>DL</span><b>DEV LIFE</b></div>
        <div className="auth-message">
          <small>START YOUR WORKSPACE</small>
          <h1>เปลี่ยนไอเดีย ให้กลายเป็นงานที่ชัดเจน</h1>
          <p>เริ่มพื้นที่ทำงานสำหรับจัดการ project context, notes และ tasks ของคุณได้ในไม่กี่วินาที</p>
          <div className="auth-preview" aria-hidden="true">
            <div><span>YOUR WORKSPACE</span><b>พร้อมสำหรับโปรเจกต์ถัดไป</b><small>Private by default</small></div>
            <ul><li><i>01</i><span><b>Capture context</b><small>เก็บข้อมูลสำคัญอย่างเป็นระบบ</small></span></li><li><i>02</i><span><b>Plan the work</b><small>แตกไอเดียเป็น task ที่ลงมือได้</small></span></li><li><i>03</i><span><b>Keep momentum</b><small>เห็น progress และทำงานต่อเนื่อง</small></span></li></ul>
          </div>
        </div>
        <p className="auth-story-footer">Your data stays protected with Supabase Auth.</p>
      </section>

      <section className="auth-entry">
        <div className="auth-card">
          <div className="auth-mobile-brand"><span>DL</span><b>DEV LIFE</b></div>
          <small className="auth-eyebrow">CREATE ACCOUNT</small>
          <h2>สมัครสมาชิก</h2>
          <p className="auth-description">สร้างบัญชีเพื่อเริ่มต้น DEV LIFE workspace ของคุณ</p>
          <form className="auth-form" action={formAction}>
            {state?.error && <p className="auth-error" role="alert">{state.error}</p>}
            {state?.success && <p className="auth-success" role="status">{state.success}</p>}
            <label htmlFor="email">อีเมล</label>
            <div className="auth-control"><span aria-hidden="true">@</span><input id="email" name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></div>
            <div className="auth-label-row"><label htmlFor="password">รหัสผ่าน</label><small>อย่างน้อย 6 ตัวอักษร</small></div>
            <div className="auth-control"><span aria-hidden="true">••</span><input id="password" name="password" type="password" autoComplete="new-password" placeholder="สร้างรหัสผ่าน" minLength={6} required /></div>
            <div className="auth-label-row"><label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</label></div>
            <div className="auth-control"><span aria-hidden="true">••</span><input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="กรอกรหัสผ่านอีกครั้ง" minLength={6} required /></div>
            <SubmitButton />
          </form>
          <p className="auth-switch">มีบัญชีอยู่แล้ว? <Link href="/login">เข้าสู่ระบบ</Link></p>
        </div>
        <p className="auth-copyright">© 2026 DEV LIFE · Developer productivity workspace</p>
      </section>
    </main>
  );
}

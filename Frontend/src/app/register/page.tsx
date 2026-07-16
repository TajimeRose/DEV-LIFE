"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { register } from "@/app/auth/actions";
import { Button, Card, FormField, Input } from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="auth-submit" variant="primary" type="submit" loading={pending}>
      <span>{pending ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}</span>
      {!pending && <span aria-hidden="true">→</span>}
    </Button>
  );
}

export default function RegisterPage() {
  const [state, formAction] = useActionState(register, null);

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <div className="auth-brand"><Image src="/Logo.png" alt="Dev Life" width={42} height={42} priority /><b>DEV LIFE</b></div>
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
        <Card className="auth-card">
          <div className="auth-mobile-brand"><Image src="/Logo.png" alt="Dev Life" width={42} height={42} priority /><b>DEV LIFE</b></div>
          <small className="auth-eyebrow">CREATE ACCOUNT</small>
          <h2>สมัครสมาชิก</h2>
          <p className="auth-description">สร้างบัญชีเพื่อเริ่มต้น DEV LIFE workspace ของคุณ</p>
          <form className="auth-form" action={formAction}>
            {state?.error && <p className="auth-error" role="alert">{state.error}</p>}
            {state?.success && <p className="auth-success" role="status">{state.success}</p>}
            <FormField label="อีเมล"><Input name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></FormField>
            <FormField label="รหัสผ่าน" hint="อย่างน้อย 6 ตัวอักษร"><Input name="password" type="password" autoComplete="new-password" placeholder="สร้างรหัสผ่าน" minLength={6} required /></FormField>
            <FormField label="ยืนยันรหัสผ่าน"><Input name="confirmPassword" type="password" autoComplete="new-password" placeholder="กรอกรหัสผ่านอีกครั้ง" minLength={6} required /></FormField>
            <SubmitButton />
          </form>
          <p className="auth-switch">มีบัญชีอยู่แล้ว? <Link href="/login">เข้าสู่ระบบ</Link></p>
        </Card>
        <p className="auth-copyright">© 2026 DEV LIFE · Developer productivity workspace</p>
      </section>
    </main>
  );
}

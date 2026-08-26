"use client";

import Link from "next/link";
import Image from "next/image";
import { use, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { register } from "@/app/auth/actions";
import { GitHubAuthButton } from "@/components/auth/GitHubAuthButton";
import { Button, Card, FormField, Input } from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="auth-submit" variant="primary" type="submit" loading={pending}>
      <span>{pending ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}</span>
    </Button>
  );
}

export default function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [state, formAction] = useActionState(register, null);
  const params = use(searchParams);

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <div className="auth-brand">
          <Image src="/Logo.png" alt="Dev Life" width={36} height={36} priority />
          <b>DEV LIFE</b>
        </div>
        <div className="auth-message">
          <h1>เปลี่ยนไอเดีย ให้กลายเป็นงานที่ส่งมอบได้</h1>
          <p>เริ่มพื้นที่ทำงานสำหรับจัดการบริบท โน้ต และงานของโปรเจกต์ได้ในไม่กี่ขั้นตอน</p>
          <div className="auth-preview" aria-hidden="true">
            <ul>
              <li>
                <i>✦</i>
                <span>
                  <b>Capture Context</b>
                  <small>บันทึกบริบทสำคัญ เอกสาร และการตัดสินใจ</small>
                </span>
              </li>
              <li>
                <i>✦</i>
                <span>
                  <b>Plan & Execute</b>
                  <small>แตกงานเป็น Kanban tasks และติดตามสถานะ</small>
                </span>
              </li>
              <li>
                <i>✦</i>
                <span>
                  <b>Stay in Sync</b>
                  <small>เชื่อมต่อ GitHub ติดตามความเคลื่อนไหวล่าสุด</small>
                </span>
              </li>
            </ul>
          </div>
        </div>
        <p className="auth-story-footer">ข้อมูลบัญชีและความปลอดภัยดูแลผ่าน Supabase Auth</p>
      </section>

      <section className="auth-entry">
        <Card className="auth-card">
          <div className="auth-mobile-brand">
            <Image src="/Logo.png" alt="Dev Life" width={36} height={36} priority />
            <b>DEV LIFE</b>
          </div>
          <h2>สมัครสมาชิก</h2>
          <p className="auth-description">สร้างบัญชีเพื่อเริ่มพื้นที่ทำงานของคุณ</p>
          <form className="auth-form" action={formAction}>
            {params.next && <input type="hidden" name="next" value={params.next} />}
            {state?.error && <p className="auth-error" role="alert">{state.error}</p>}
            {state?.success && <p className="auth-success" role="status">{state.success}</p>}
            <FormField label="อีเมล">
              <Input name="email" type="email" autoComplete="email" placeholder="name@example.com" required />
            </FormField>
            <FormField label="รหัสผ่าน" hint="อย่างน้อย 6 ตัวอักษร">
              <Input name="password" type="password" autoComplete="new-password" placeholder="สร้างรหัสผ่าน" minLength={6} required />
            </FormField>
            <FormField label="ยืนยันรหัสผ่าน">
              <Input name="confirmPassword" type="password" autoComplete="new-password" placeholder="กรอกรหัสผ่านอีกครั้ง" minLength={6} required />
            </FormField>
            <SubmitButton />
          </form>
          <div className="auth-divider"><span>หรือ</span></div>
          <GitHubAuthButton label="สมัครสมาชิกด้วย GitHub" next={params.next} />
          <p className="auth-switch">
            มีบัญชีอยู่แล้ว?{" "}
            <Link href={params.next ? `/login?next=${encodeURIComponent(params.next)}` : "/login"}>
              เข้าสู่ระบบ
            </Link>
          </p>
        </Card>
        <p className="auth-copyright">© 2026 DEV LIFE · Developer Workspace</p>
      </section>
    </main>
  );
}

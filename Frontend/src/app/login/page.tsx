"use client";

import Link from "next/link";
import Image from "next/image";
import { use, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login } from "@/app/auth/actions";
import { GitHubAuthButton } from "@/components/auth/GitHubAuthButton";
import { Button, Card, FormField, Input } from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="auth-submit" variant="primary" type="submit" loading={pending}>
      <span>{pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่พื้นที่ทำงาน"}</span>
    </Button>
  );
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ authError?: string; next?: string }> }) {
  const [state, formAction] = useActionState(login, null);
  const params = use(searchParams);

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <div className="auth-brand">
          <Image src="/Logo.png" alt="Dev Life" width={42} height={42} priority />
          <b>DEV LIFE</b>
        </div>
        <div className="auth-message">
          <h1>ทุกบริบทของโปรเจกต์ อยู่ในพื้นที่เดียว</h1>
          <p>จัดการโน้ต งาน และขั้นตอนการพัฒนาให้ต่อเนื่อง พร้อมกลับมาทำงานต่อได้ทันที</p>
          <div className="auth-preview" aria-hidden="true">
            <ul><li><i>01</i><span><b>บริบทของโปรเจกต์</b><small>โน้ตและงานอยู่ในพื้นที่เดียวกัน</small></span></li><li><i>02</i><span><b>ขั้นตอนการทำงาน</b><small>วางแผนและลงมือในที่เดียว</small></span></li><li><i>03</i><span><b>ความคืบหน้า</b><small>ติดตามสิ่งสำคัญได้ชัดเจน</small></span></li></ul>
          </div>
        </div>
        <p className="auth-story-footer">พื้นที่ทำงานที่ชัดเจนสำหรับนักพัฒนา</p>
      </section>

      <section className="auth-entry">
        <Card className="auth-card">
          <div className="auth-mobile-brand"><Image src="/Logo.png" alt="Dev Life" width={42} height={42} priority /><b>DEV LIFE</b></div>
          <h2>เข้าสู่ระบบ</h2>
          <p className="auth-description">กรอกข้อมูลเพื่อกลับเข้าสู่พื้นที่ทำงานของคุณ</p>
          {params.authError === "github" && <p className="auth-error" role="alert">เข้าสู่ระบบด้วย GitHub ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>}
          <form className="auth-form" action={formAction}>
            {params.next && <input type="hidden" name="next" value={params.next} />}
            {state?.error && <p className="auth-error" role="alert">{state.error}</p>}
            <FormField label="อีเมล"><Input name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></FormField>
            <FormField label="รหัสผ่าน" hint="อย่างน้อย 6 ตัวอักษร"><Input name="password" type="password" autoComplete="current-password" placeholder="กรอกรหัสผ่าน" minLength={6} required /></FormField>
            <SubmitButton />
          </form>
          <div className="auth-divider"><span>หรือ</span></div>
          <GitHubAuthButton label="เข้าสู่ระบบด้วย GitHub" next={params.next} />
          <p className="auth-switch">ยังไม่มีบัญชี? <Link href={params.next ? `/register?next=${encodeURIComponent(params.next)}` : "/register"}>สมัครสมาชิกฟรี</Link></p>
          <div className="auth-secure"><p><b>การยืนยันตัวตนที่ปลอดภัย</b><small>บัญชีและ Session ของคุณได้รับการจัดการผ่าน Supabase Auth</small></p></div>
        </Card>
        <p className="auth-copyright">© 2026 DEV LIFE · พื้นที่ทำงานสำหรับนักพัฒนา</p>
      </section>
    </main>
  );
}

"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/auth/actions";
import { Button, Card, FormField, Input } from "@/components/ui";

export function ProfileSettings({ displayName, email }: { displayName: string; email?: string }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  return <Card className="feature-panel settings-panel"><form action={action}><FormField label="ชื่อที่แสดง"><Input name="displayName" defaultValue={displayName} required maxLength={80} /></FormField><FormField label="อีเมล"><Input value={email ?? ""} disabled /></FormField>{state?.error && <p className="form-error" role="alert">{state.error}</p>}{state?.success && <p className="form-success" role="status">{state.success}</p>}<Button variant="primary" loading={pending}>บันทึกการตั้งค่า</Button></form></Card>;
}

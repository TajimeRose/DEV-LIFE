"use client";

import { useActionState } from "react";
import Link from "next/link";
import { renameActiveProject } from "@/app/actions/workspace";
import { logout } from "@/app/auth/actions";
import { updateProfile } from "@/app/auth/actions";
import { Button, Card, FormField, Input } from "@/components/ui";

export function ProfileSettings({ displayName, email, projectId, projectName }: { displayName: string; email?: string; projectId: string; projectName: string }) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfile, null);
  const [projectState, projectAction, projectPending] = useActionState(renameActiveProject, null);
  return <div className="settings-grid">
    <Card className="feature-panel settings-panel"><h2>บัญชีของฉัน</h2><form action={profileAction}><FormField label="ชื่อไอดี / ชื่อที่แสดง"><Input name="displayName" defaultValue={displayName} required maxLength={80} /></FormField><FormField label="อีเมล"><Input value={email ?? ""} disabled /></FormField>{profileState?.error && <p className="form-error" role="alert">{profileState.error}</p>}{profileState?.success && <p className="form-success" role="status">{profileState.success}</p>}<Button variant="primary" loading={profilePending}>บันทึกชื่อ</Button></form></Card>
    <Card className="feature-panel settings-panel"><h2>โปรเจกต์ปัจจุบัน</h2><form action={projectAction}><input type="hidden" name="projectId" value={projectId} /><FormField label="ชื่อโปรเจกต์"><Input name="name" defaultValue={projectName} required maxLength={200} /></FormField>{projectState?.error && <p className="form-error" role="alert">{projectState.error}</p>}{projectState?.success && <p className="form-success" role="status">{projectState.success}</p>}<Button variant="primary" loading={projectPending}>เปลี่ยนชื่อโปรเจกต์</Button></form><Link className="settings-switch-link" href="/projects">สลับหรือสร้างโปรเจกต์อื่น →</Link></Card>
    <Card className="feature-panel settings-panel settings-session"><div><h2>เซสชัน</h2><p>ออกจากระบบบนอุปกรณ์นี้</p></div><form action={logout}><Button type="submit" variant="danger">ออกจากระบบ</Button></form></Card>
  </div>;
}

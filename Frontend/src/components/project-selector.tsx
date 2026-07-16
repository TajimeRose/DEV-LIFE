"use client";

import Image from "next/image";
import { useActionState } from "react";
import { createAndSelectProject, selectProject } from "@/app/actions/workspace";
import { logout } from "@/app/auth/actions";
import type { Project } from "@/lib/database.types";
import { Button, Card, FormField, Input } from "@/components/ui";

export function ProjectSelector({ projects, displayName }: { projects: Project[]; displayName: string }) {
  const [state, createAction, pending] = useActionState(createAndSelectProject, null);
  return <main className="project-select-page"><section className="project-select-shell">
    <header className="project-select-header"><div className="project-select-brand"><Image src="/Logo.png" alt="Dev Life" width={48} height={48} priority /><div><b>DEV LIFE</b><small>Project cockpit</small></div></div><form action={logout}><Button type="submit">ออกจากระบบ</Button></form></header>
    <div className="project-select-intro"><small>WELCOME, {displayName}</small><h1>เลือกโปรเจกต์ที่จะทำงาน</h1><p>งาน โน้ต และกิจกรรมจะแสดงเฉพาะข้อมูลของโปรเจกต์ที่คุณเลือก</p></div>
    {projects.length > 0 && <section className="project-list" aria-label="โปรเจกต์ของคุณ">{projects.map(project => <form action={selectProject} key={project.id}><input type="hidden" name="projectId" value={project.id} /><button type="submit"><span><b>{project.name}</b><small>สร้างเมื่อ {new Date(project.created_at).toLocaleDateString("th-TH")}</small></span><i aria-hidden="true">→</i></button></form>)}</section>}
    <Card className="create-project-card"><h2>{projects.length ? "สร้างโปรเจกต์ใหม่" : "สร้างโปรเจกต์แรกของคุณ"}</h2><form action={createAction}><FormField label="ชื่อโปรเจกต์"><Input name="name" required maxLength={200} placeholder="เช่น เว็บไซต์บริษัท" /></FormField>{state?.error && <p className="form-error" role="alert">{state.error}</p>}<Button variant="primary" loading={pending}>สร้างและเปิดโปรเจกต์</Button></form></Card>
  </section></main>;
}

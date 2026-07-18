"use client";

import Image from "next/image";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createAndSelectProject, selectProject } from "@/app/actions/workspace";
import { logout } from "@/app/auth/actions";
import type { Tables } from "@/lib/database.types";
import { Button, Card, FormField, Input } from "@/components/ui";

type ProjectSummary = Pick<Tables<"projects">, "id" | "name" | "created_at">;

function ProjectButton({ project }: { project: ProjectSummary }) {
  const { pending } = useFormStatus();

  return <button type="submit" disabled={pending} aria-label={`เปิดโปรเจกต์ ${project.name}`}>
    <span>
      <b>{project.name}</b>
      <small>สร้างเมื่อ {project.created_at ? new Date(project.created_at).toLocaleDateString("th-TH") : "ไม่ทราบวันที่"}</small>
    </span>
    <i className={pending ? "project-open-state" : ""} aria-hidden="true">
      {pending ? <><span className="ui-spinner" /> กำลังเปิด</> : "→"}
    </i>
  </button>;
}

export function ProjectSelector({ projects, displayName }: { projects: ProjectSummary[]; displayName: string }) {
  const [state, createAction, pending] = useActionState(createAndSelectProject, null);
  return <main className="project-select-page"><section className="project-select-shell">
    <header className="project-select-header"><div className="project-select-brand"><Image src="/Logo.png" alt="Dev Life" width={48} height={48} priority /><div><b>DEV LIFE</b><small>Project cockpit</small></div></div><form action={logout}><Button type="submit">ออกจากระบบ</Button></form></header>
    <div className="project-select-intro"><small>WELCOME, {displayName}</small><div><h1>เลือกโปรเจกต์ที่จะทำงาน</h1>{projects.length > 0 && <span>{projects.length} โปรเจกต์</span>}</div><p>งาน โน้ต และกิจกรรมจะแสดงเฉพาะข้อมูลของโปรเจกต์ที่คุณเลือก</p></div>
    {projects.length > 0 && <section className="project-list" aria-label="โปรเจกต์ของคุณ">{projects.map(project => <form action={selectProject} key={project.id}><input type="hidden" name="projectId" value={project.id} /><ProjectButton project={project} /></form>)}</section>}
    <Card className="create-project-card"><h2>{projects.length ? "สร้างโปรเจกต์ใหม่" : "สร้างโปรเจกต์แรกของคุณ"}</h2><form action={createAction}><FormField label="ชื่อโปรเจกต์"><Input name="name" required maxLength={200} placeholder="เช่น เว็บไซต์บริษัท" /></FormField>{state?.error && <p className="form-error" role="alert">{state.error}</p>}<Button variant="primary" loading={pending}>สร้างและเปิดโปรเจกต์</Button></form></Card>
  </section></main>;
}

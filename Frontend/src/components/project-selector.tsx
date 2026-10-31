"use client";

import Image from "next/image";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createAndSelectProject, selectProject } from "@/app/actions/workspace";
import { logout } from "@/app/auth/actions";
import type { Tables } from "@/lib/database.types";
import { Badge, Button, Card, FormField, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icons";

type ProjectSummary = Pick<Tables<"projects">, "id" | "name" | "created_at">;

function ProjectButton({ project }: { project: ProjectSummary }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={`เปิดโปรเจกต์ ${project.name}`}
      className="project-card-button"
    >
      <div className="project-card-left">
        <div className="project-card-icon" aria-hidden="true">
          <Icon name="projects" size={20} />
        </div>
        <div className="project-card-meta">
          <b className="project-card-name">{project.name}</b>
          <small className="project-card-date">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            สร้างเมื่อ {project.created_at ? new Date(project.created_at).toLocaleDateString("th-TH") : "ไม่ทราบวันที่"}
          </small>
        </div>
      </div>
      <div className={`project-card-action ${pending ? "is-pending" : ""}`}>
        {pending ? (
          <>
            <span className="ui-spinner" aria-hidden="true" />
            <span>กำลังเปิด…</span>
          </>
        ) : (
          <>
            <span>เปิดโปรเจกต์</span>
            <span className="project-card-arrow" aria-hidden="true">
              →
            </span>
          </>
        )}
      </div>
    </button>
  );
}

export function ProjectSelector({
  projects,
  displayName,
}: {
  projects: ProjectSummary[];
  displayName: string;
}) {
  const [state, createAction, pending] = useActionState(createAndSelectProject, null);

  return (
    <main className="project-select-page">
      <div className="project-select-backdrop" aria-hidden="true" />
      <section className="project-select-shell">
        <header className="project-select-header">
          <div className="project-select-brand">
            <div className="project-select-brand-logo">
              <Image src="/Logo.png" alt="Dev Life" width={32} height={32} priority />
            </div>
            <div>
              <b>DEV LIFE</b>
              <small>พื้นที่ทำงานของนักพัฒนา</small>
            </div>
          </div>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm" className="logout-btn">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>ออกจากระบบ</span>
            </Button>
          </form>
        </header>

        <div className="project-select-intro">
          <div className="project-user-chip">
            <span className="user-dot" aria-hidden="true" />
            <span>
              สวัสดี <b>{displayName}</b>
            </span>
          </div>
          <div className="project-select-title-row">
            <h1>เลือกโปรเจกต์</h1>
            {projects.length > 0 && <Badge tone="brand">{projects.length} โปรเจกต์</Badge>}
          </div>
          <p>งาน โน้ต และกิจกรรมทั้งหมดจะเชื่อมโยงตามโปรเจกต์ที่คุณเลือกทำงาน</p>
        </div>

        {projects.length > 0 && (
          <section className="project-list" aria-label="โปรเจกต์ของคุณ">
            {projects.map((project) => (
              <form action={selectProject} key={project.id}>
                <input type="hidden" name="projectId" value={project.id} />
                <ProjectButton project={project} />
              </form>
            ))}
          </section>
        )}

        <Card className="create-project-card">
          <div className="create-project-head">
            <div className="create-project-icon" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div>
              <h2>{projects.length ? "สร้างโปรเจกต์ใหม่" : "สร้างโปรเจกต์แรกของคุณ"}</h2>
              <p>สร้างพื้นที่ทำงานแยกสำหรับระบบ หรือ repository ใหม่</p>
            </div>
          </div>
          <form action={createAction} className="create-project-form">
            <FormField label="ชื่อโปรเจกต์">
              <Input
                name="name"
                required
                maxLength={200}
                placeholder="เช่น เว็บไซต์บริษัท, E-Commerce API"
              />
            </FormField>
            {state?.error && (
              <p className="form-error" role="alert">
                {state.error}
              </p>
            )}
            <Button
              variant="primary"
              type="submit"
              loading={pending}
              className="create-project-submit"
            >
              <span>สร้างและเปิดโปรเจกต์</span>
              <span aria-hidden="true">→</span>
            </Button>
          </form>
        </Card>
      </section>
    </main>
  );
}

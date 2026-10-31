"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  aiAnalyzeRequirement,
  aiCreateTasksFromRequirement,
  applyTemplate,
  convertIdeaToNote,
  convertIdeaToTask,
  createIdea,
  createNote,
  createProject,
  createTask,
  deleteIdea,
  deleteTask,
  getIdeas,
  getNotes,
  getTasks,
  searchWorkspace,
  updateNote,
  updateTask,
  type AiGeneratedTask,
  type ContextMapData,
  type IdeaItem,
  type SearchResultItem,
} from "@/app/actions/data";
import { BUILTIN_TEMPLATES, type TemplateData } from "@/lib/templates";
import { Badge, Button, Card, EmptyState, FormField, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { Icon } from "@/components/ui/icons";
import type { Tables } from "@/lib/database.types";
import { canEditProject } from "@/lib/projects/permissions";
import { useProjectRealtime } from "@/lib/realtime/use-project-realtime";

type Activity = Tables<"activities">;
type Note = Tables<"notes">;
type Project = Tables<"projects">;
type ProjectActivity = Tables<"project_activity_logs">;
type Task = Tables<"tasks">;

export function NoProject() {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setError("");
    startTransition(async () => {
      try {
        await createProject({ name, status: "active" });
        window.location.reload();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "สร้างโปรเจกต์ไม่สำเร็จ");
      }
    });
  };
  return <Card className="empty-workspace"><h1>สร้างโปรเจกต์แรกของคุณ</h1><p>งาน โน้ต และกิจกรรมจะถูกจัดเก็บแยกตามโปรเจกต์</p><form onSubmit={submit}><FormField label="ชื่อโปรเจกต์"><Input value={name} onChange={event => setName(event.target.value)} required maxLength={200} /></FormField>{error && <p className="form-error" role="alert">{error}</p>}<Button variant="primary" loading={pending}>สร้างโปรเจกต์</Button></form></Card>;
}

function activityLabel(action: string, entityType: string) {
  if (entityType === "idea" && action === "captured") return "บันทึกไอเดียใหม่";
  if (action === "created") return `สร้าง${entityTypeLabel(entityType)}ใหม่`;
  if (action === "updated") return `แก้ไข${entityTypeLabel(entityType)}`;
  if (action === "deleted") return `ลบ${entityTypeLabel(entityType)}`;
  if (action === "completed" || action === "done") return `ทำ${entityTypeLabel(entityType)}เสร็จ`;
  return `${action} ${entityTypeLabel(entityType)}`;
}

function entityTypeLabel(type: string) {
  switch (type) {
    case "task": return "งาน";
    case "note": return "โน้ต";
    case "project": return "โปรเจกต์";
    case "idea": return "ไอเดีย";
    case "flowchart": return "แผนผัง";
    case "repository": return "Repository";
    default: return type;
  }
}

function renderEntityIcon(type: string) {
  switch (type) {
    case "task": return <Icon name="tasks" size={14} />;
    case "note": return <Icon name="notes" size={14} />;
    case "project": return <Icon name="projects" size={14} />;
    case "idea": return <Icon name="inbox" size={14} />;
    case "flowchart": return <Icon name="flowchart" size={14} />;
    case "repository": return <Icon name="repository" size={14} />;
    default: return <Icon name="activity" size={14} />;
  }
}

function taskStatusLabel(status: string) {
  switch (status) {
    case "done": return "เสร็จสิ้น";
    case "review": return "รอตรวจ";
    case "in_progress": return "กำลังทำ";
    case "todo": return "รอดำเนินการ";
    default: return status;
  }
}

function taskStatusTone(status: string): "success" | "warning" | "brand" | "neutral" {
  switch (status) {
    case "done": return "success";
    case "review": return "warning";
    case "in_progress": return "brand";
    default: return "neutral";
  }
}

export function ConnectedDashboard({
  project,
  tasks,
  activities,
  displayName,
}: {
  project: Project;
  tasks: Task[];
  activities: Activity[];
  displayName?: string;
}) {
  const completed = tasks.filter((task) => task.status === "done").length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const openTasks = tasks.length - completed;
  const inReview = tasks.filter((task) => task.status === "review").length;
  const inProgress = tasks.filter((task) => task.status === "in_progress").length;
  const healthLabel =
    tasks.length === 0
      ? "เริ่มต้นโปรเจกต์"
      : progress >= 75
      ? "ใกล้เสร็จสมบูรณ์"
      : progress >= 40
      ? "กำลังดำเนินการ"
      : "อยู่ในช่วงเริ่มต้น";

  return (
    <>
      <section className="project-hero">
        <div className="project-hero-info">
          <div className="project-hero-badge-row">
            <span className="live-status-dot" aria-hidden="true" />
            <Badge tone="brand">
              {project.status === "active" ? "กำลังดำเนินการ" : project.status ?? "ไม่ระบุสถานะ"}
            </Badge>
            {displayName && <span className="hero-greeting">สวัสดีคุณ <b>{displayName}</b></span>}
          </div>
          <h1>{project.name}</h1>
          <p>ติดตามสถานะงาน กิจกรรมล่าสุด และความคืบหน้าของพื้นที่ทำงาน</p>
        </div>
        <div className="hero-actions">
          <Link className="hero-btn hero-btn-primary" href="/checklists">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>เพิ่มงาน</span>
          </Link>
          <Link className="hero-btn hero-btn-secondary" href="/notes">
            <span>เขียนโน้ต</span>
          </Link>
          <Link className="hero-btn hero-btn-ghost" href="/board">
            <span>บอร์ด Kanban</span>
          </Link>
        </div>
      </section>

      <section className="overview-stats" aria-label="สรุปสถานะงาน">
        <article className="stat-card">
          <div className="stat-card-header">
            <span>งานทั้งหมด</span>
            <Icon name="tasks" size={14} />
          </div>
          <b>{tasks.length}</b>
          <small>งานทุกสถานะในโปรเจกต์</small>
        </article>
        <article className="stat-card">
          <div className="stat-card-header">
            <span>งานที่เปิดอยู่</span>
            <Icon name="overview" size={14} />
          </div>
          <b>{openTasks}</b>
          <small>{inProgress} กำลังทำ · {inReview} รอตรวจ</small>
        </article>
        <article className="stat-card">
          <div className="stat-card-header">
            <span>เสร็จสิ้นแล้ว</span>
            <Badge tone="success">Done</Badge>
          </div>
          <b style={{ color: "var(--success)" }}>{completed}</b>
          <small>{progress}% ของงานทั้งหมด</small>
        </article>
        <article className="stat-card overview-progress-stat">
          <div className="stat-card-header">
            <span>ความคืบหน้า</span>
            <Badge tone="brand" className="stat-health-badge">{healthLabel}</Badge>
          </div>
          <b>{progress}%</b>
          <div
            className="overview-progress-track"
            role="progressbar"
            aria-label="ความคืบหน้าของโปรเจกต์"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <i style={{ width: `${progress}%` }} />
          </div>
        </article>
      </section>

      <div className="cockpit-grid">
        <section className="cockpit-main">
          <div className="section-head">
            <div className="section-title-wrap">
              <h2>งานล่าสุด</h2>
            </div>
            <Link className="section-action-link" href="/checklists">
              ดูงานทั้งหมด ({tasks.length}) →
            </Link>
          </div>
          <div className="focus-list">
            {tasks.length ? (
              tasks.slice(0, 5).map((task) => (
                <Link key={task.id} href="/checklists" className="focus-task-item">
                  <Badge tone={taskStatusTone(task.status)}>
                    {taskStatusLabel(task.status)}
                  </Badge>
                  <div className="focus-task-title-wrap">
                    <b className="focus-task-title">{task.title}</b>
                    {task.description && (
                      <span className="focus-task-sub">{task.description}</span>
                    )}
                  </div>
                  <div className="focus-task-badges">
                    <span className={`priority ${priorityClass(task.priority)}`}>
                      {priorityLabel(task.priority)}
                    </span>
                    {task.due_date && (
                      <small className="focus-task-date">กำหนดส่ง: {task.due_date}</small>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <div className="empty-tasks-box">
                <p>ยังไม่มีงานในโปรเจกต์นี้</p>
                <Link className="ui-button ui-button-sm ui-button-secondary" href="/checklists">
                  สร้างงานแรก
                </Link>
              </div>
            )}
          </div>

          <div className="section-head activity-head">
            <div className="section-title-wrap">
              <h2>กิจกรรมล่าสุดใน Workspace</h2>
            </div>
            <Link className="section-action-link" href="/activity">
              ดูประวัติทั้งหมด →
            </Link>
          </div>
          <div className="compact-activity">
            {activities.slice(0, 5).map((item) => (
              <article key={item.id} className="dashboard-activity-row">
                <span className="activity-icon-pill" aria-hidden="true">
                  {renderEntityIcon(item.entity_type)}
                </span>
                <div className="activity-text-wrap">
                  <b>{activityLabel(item.action, item.entity_type)}</b>
                  <small>
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString("th-TH")
                      : "ไม่ทราบเวลา"}
                  </small>
                </div>
              </article>
            ))}
            {!activities.length && (
              <p className="empty-copy">ยังไม่มีกิจกรรมที่บันทึกไว้</p>
            )}
          </div>
        </section>

        <aside className="cockpit-side">
          <Card className="project-health">
            <div className="section-head">
              <div>
                <h2>สุขภาพโปรเจกต์</h2>
                <small style={{ color: "var(--muted)" }}>{healthLabel}</small>
              </div>
              <strong className="health-stat-number">{progress}%</strong>
            </div>
            <div
              className="progress"
              role="progressbar"
              aria-label="สุขภาพโปรเจกต์"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <i style={{ width: `${progress}%` }} />
            </div>
            <dl className="health-metrics-list">
              <div>
                <dt>งานที่เปิดอยู่ (Active)</dt>
                <dd><b>{openTasks}</b></dd>
              </div>
              <div>
                <dt>กำลังทำ (In Progress)</dt>
                <dd><b>{inProgress}</b></dd>
              </div>
              <div>
                <dt>รอตรวจสอบ (In Review)</dt>
                <dd><b>{inReview}</b></dd>
              </div>
              <div>
                <dt>เสร็จสมบูรณ์ (Done)</dt>
                <dd><b style={{ color: "var(--success)" }}>{completed}</b></dd>
              </div>
              <div>
                <dt>บันทึกกิจกรรมล่าสุด</dt>
                <dd><b>{activities.length} รายการ</b></dd>
              </div>
            </dl>
            <Link className="project-health-link" href="/board">
              <span>เปิดบอร์ด Kanban</span>
              <span aria-hidden="true">→</span>
            </Link>
          </Card>

          <Card className="quick-tools-card">
            <div className="section-head" style={{ marginBottom: "14px" }}>
              <h2>เครื่องมือด่วน</h2>
            </div>
            <div className="quick-tools-grid">
              <Link href="/inbox" className="quick-tool-item">
                <span className="quick-tool-icon"><Icon name="inbox" size={16} /></span>
                <div>
                  <b>กล่องไอเดีย</b>
                  <small>จดความคิดเร็วๆ ไม่ให้สูญหาย</small>
                </div>
              </Link>
              <Link href="/ai-tools" className="quick-tool-item">
                <span className="quick-tool-icon"><Icon name="ai" size={16} /></span>
                <div>
                  <b>ผู้ช่วย AI</b>
                  <small>แยก Requirement เป็น Tasks</small>
                </div>
              </Link>
              <Link href="/flowchart" className="quick-tool-item">
                <span className="quick-tool-icon"><Icon name="flowchart" size={16} /></span>
                <div>
                  <b>แผนผัง Flowchart</b>
                  <small>ออกแบบ Process และ System Flow</small>
                </div>
              </Link>
              <Link href="/context-map" className="quick-tool-item">
                <span className="quick-tool-icon"><Icon name="contextMap" size={16} /></span>
                <div>
                  <b>แผนที่บริบท</b>
                  <small>ดูโครงสร้างโปรเจกต์ทั้งหมด</small>
                </div>
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

function priorityLabel(priority: string) {
  if (priority === "สูง") return "สำคัญมาก";
  if (priority === "กลาง") return "สำคัญ";
  if (priority === "ต่ำ") return "ทั่วไป";
  return priority;
}

function priorityClass(priority: string) {
  const label = priorityLabel(priority);
  if (label === "สำคัญมาก") return "priority-urgent";
  if (label === "สำคัญ") return "priority-important";
  return "priority-normal";
}

export function TaskDetailModal({
  task,
  open,
  onClose,
  editable,
  onUpdate,
  onDelete,
}: {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  editable: boolean;
  onUpdate: (updated: Task) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState(task?.status ?? "todo");
  const [priority, setPriority] = useState(task?.priority ?? "ทั่วไป");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [branchName, setBranchName] = useState(task?.branch_name ?? "");
  const [commitSha, setCommitSha] = useState(task?.linked_commit_sha ?? "");
  const [prNumber, setPrNumber] = useState<string>(task?.linked_pull_request_number ? String(task.linked_pull_request_number) : "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title ?? "");
      setDescription(task.description ?? "");
      setStatus(task.status ?? "todo");
      setPriority(task.priority ?? "ทั่วไป");
      setDueDate(task.due_date ?? "");
      setBranchName(task.branch_name ?? "");
      setCommitSha(task.linked_commit_sha ?? "");
      setPrNumber(task.linked_pull_request_number ? String(task.linked_pull_request_number) : "");
      setError("");
    }
  }, [task]);

  if (!task) return null;

  const save = () => {
    if (!editable || !title.trim() || pending) return;
    setError("");
    startTransition(async () => {
      try {
        const updated = await updateTask(task.id, {
          title,
          description: description || null,
          status,
          priority,
          due_date: dueDate || null,
          branch_name: branchName || null,
          linked_commit_sha: commitSha || null,
          linked_pull_request_number: prNumber ? parseInt(prNumber, 10) : null,
        }, "อัปเดตรายละเอียดงาน");
        onUpdate(updated);
        onClose();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "บันทึกข้อมูลไม่สำเร็จ");
      }
    });
  };

  const remove = () => {
    if (!editable || pending) return;
    if (!confirm("คุณแน่ใจว่าต้องการลบงานนี้หรือไม่?")) return;
    setError("");
    startTransition(async () => {
      try {
        await deleteTask(task.id);
        onDelete(task.id);
        onClose();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "ลบงานไม่สำเร็จ");
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="รายละเอียดงาน"
      description="ดูและจัดการรายละเอียด ข้อมูลวันที่ และการเชื่อมโยงกับ Git"
      footer={
        <>
          {editable && (
            <Button variant="danger" onClick={remove} disabled={pending} style={{ marginRight: "auto" }}>
              ลบงาน
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            ยกเลิก
          </Button>
          {editable && (
            <Button variant="primary" onClick={save} loading={pending} disabled={!title.trim()}>
              บันทึกการแก้ไข
            </Button>
          )}
        </>
      }
    >
      <div style={{ display: "grid", gap: "14px", padding: "4px 0" }}>
        {error && <p className="form-error" role="alert">{error}</p>}

        <FormField label="ชื่องาน">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!editable || pending}
            placeholder="ชื่องาน..."
            required
          />
        </FormField>

        <FormField label="รายละเอียด">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!editable || pending}
            placeholder="เพิ่มรายละเอียดเกี่ยวกับงานนี้..."
            rows={4}
          />
        </FormField>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <FormField label="สถานะ">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={!editable || pending}
            >
              <option value="todo">รอทำ (Todo)</option>
              <option value="in_progress">กำลังทำ (In Progress)</option>
              <option value="review">ตรวจสอบ (Review)</option>
              <option value="done">เสร็จแล้ว (Done)</option>
            </Select>
          </FormField>

          <FormField label="ความสำคัญ">
            <Select
              value={priorityLabel(priority)}
              onChange={(e) => setPriority(e.target.value)}
              disabled={!editable || pending}
            >
              <option>ทั่วไป</option>
              <option>สำคัญ</option>
              <option>สำคัญมาก</option>
            </Select>
          </FormField>
        </div>

        <FormField label="กำหนดส่ง (Due Date)">
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={!editable || pending}
          />
        </FormField>

        <div style={{ borderTop: "1px solid var(--line)", paddingTop: "12px", display: "grid", gap: "10px" }}>
          <small style={{ fontWeight: 800, color: "var(--brand)" }}>🔗 เชื่อมโยง GITHUB / GIT</small>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <FormField label="Branch Name">
              <Input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                disabled={!editable || pending}
                placeholder="เช่น feature/login"
              />
            </FormField>

            <FormField label="Pull Request #">
              <Input
                type="number"
                value={prNumber}
                onChange={(e) => setPrNumber(e.target.value)}
                disabled={!editable || pending}
                placeholder="เช่น 12"
              />
            </FormField>
          </div>

          <FormField label="Commit SHA">
            <Input
              value={commitSha}
              onChange={(e) => setCommitSha(e.target.value)}
              disabled={!editable || pending}
              placeholder="เช่น 7a8b9c0d..."
            />
          </FormField>
        </div>
      </div>
    </Modal>
  );
}

export function ConnectedTasks({
  project,
  initial,
  role = "owner",
}: {
  project: Project;
  initial: Task[];
  role?: string;
}) {
  const [tasks, setTasks] = useState(initial);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("ทั่วไป");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const editable = canEditProject(role);

  useProjectRealtime("tasks", project.id, () => void getTasks(project.id).then(setTasks));

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!editable || !title.trim() || pending) return;
    setError("");
    startTransition(async () => {
      try {
        const task = await createTask({
          project_id: project.id,
          title,
          description: "",
          status: "todo",
          priority,
        });
        setTasks((current) => [task, ...current]);
        setTitle("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "เพิ่มงานไม่สำเร็จ");
      }
    });
  };

  const toggle = (task: Task) => {
    if (!editable || pending) return;
    const status = task.status === "done" ? "todo" : "done";
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, status } : item)),
    );
    startTransition(async () => {
      try {
        const updated = await updateTask(task.id, { status });
        setTasks((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } catch (cause) {
        setTasks((current) =>
          current.map((item) => (item.id === task.id ? task : item)),
        );
        setError(cause instanceof Error ? cause.message : "อัปเดตงานไม่สำเร็จ");
      }
    });
  };

  const changePriority = (task: Task, nextPriority: string) => {
    if (!editable || pending || priorityLabel(task.priority) === nextPriority) return;
    setError("");
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, priority: nextPriority } : item,
      ),
    );
    startTransition(async () => {
      try {
        const updated = await updateTask(
          task.id,
          { priority: nextPriority },
          `เปลี่ยนความสำคัญเป็น ${nextPriority}`,
        );
        setTasks((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } catch (cause) {
        setTasks((current) =>
          current.map((item) => (item.id === task.id ? task : item)),
        );
        setError(cause instanceof Error ? cause.message : "เปลี่ยนความสำคัญไม่สำเร็จ");
      }
    });
  };

  return (
    <>
      <div className="heading">
        <div>
          <small>งาน</small>
          <h1>{project.name}</h1>
          <p>จัดลำดับความสำคัญและติดตามงานทั้งหมด (คลิกที่ชื่องานเพื่อดูรายละเอียด)</p>
        </div>
        <Link className="view-board" href="/board">
          ดูแบบบอร์ด
        </Link>
      </div>

      <section className="panel feature-panel">
        <div className="checklist">
          {!editable && (
            <p className="form-hint" role="status">
              คุณมีสิทธิ์อ่านอย่างเดียวในโปรเจกต์นี้
            </p>
          )}
          {tasks.map((task) => (
            <div
              className="task"
              key={task.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <input
                  disabled={!editable || pending}
                  aria-label={`ทำเครื่องหมาย ${task.title}`}
                  type="checkbox"
                  checked={task.status === "done"}
                  onChange={() => toggle(task)}
                />
                <button
                  type="button"
                  onClick={() => setSelectedTask(task)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    textAlign: "left",
                    cursor: "pointer",
                    color: "inherit",
                    font: "inherit",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <span
                    className={task.status === "done" ? "strike" : ""}
                    style={{ fontWeight: 600 }}
                  >
                    {task.title}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                      fontSize: "11px",
                      color: "var(--muted)",
                    }}
                  >
                    {task.due_date && <span>📅 {task.due_date}</span>}
                    {task.branch_name && <span>🌿 {task.branch_name}</span>}
                    {task.linked_pull_request_number && (
                      <span>🔀 #{task.linked_pull_request_number}</span>
                    )}
                  </div>
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Select
                  disabled={!editable || pending}
                  className={`task-priority-select ${priorityClass(task.priority)}`}
                  aria-label={`ความสำคัญของ ${task.title}`}
                  value={priorityLabel(task.priority)}
                  onChange={(event) => changePriority(task, event.target.value)}
                >
                  <option>ทั่วไป</option>
                  <option>สำคัญ</option>
                  <option>สำคัญมาก</option>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => setSelectedTask(task)}>
                  แก้ไข
                </Button>
              </div>
            </div>
          ))}
          {!tasks.length && <p className="empty-copy">ยังไม่มีงาน</p>}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {editable && (
            <form className="task-form" onSubmit={add}>
              <Input
                aria-label="ชื่องาน"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="เพิ่มงาน…"
                required
              />
              <Select
                aria-label="ความสำคัญ"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                <option>ทั่วไป</option>
                <option>สำคัญ</option>
                <option>สำคัญมาก</option>
              </Select>
              <Button variant="primary" loading={pending}>
                เพิ่มงาน
              </Button>
            </form>
          )}
        </div>
      </section>

      <TaskDetailModal
        task={selectedTask}
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        editable={editable}
        onUpdate={(updated) =>
          setTasks((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          )
        }
        onDelete={(id) => setTasks((current) => current.filter((item) => item.id !== id))}
      />
    </>
  );
}

function noteText(content: Note["content"]) {
  return typeof content === "string" ? content : JSON.stringify(content, null, 2);
}

export function ConnectedNotes({
  project,
  initial,
  role = "owner",
}: {
  project: Project;
  initial: Note[];
  role?: string;
}) {
  const [notes, setNotes] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? "");
  const [savedSnapshots, setSavedSnapshots] = useState(() =>
    Object.fromEntries(
      initial.map((note) => [note.id, `${note.title}\n${noteText(note.content)}`]),
    ),
  );
  const [nextId, setNextId] = useState("");
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const selected = notes.find((note) => note.id === selectedId);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();
  const editable = canEditProject(role);
  const snapshot = selected ? `${selected.title}\n${noteText(selected.content)}` : "";
  const dirty = Boolean(selected && savedSnapshots[selected.id] !== snapshot);

  useProjectRealtime("notes", project.id, () =>
    void getNotes(project.id).then((next) => {
      if (dirty) return;
      setNotes(next);
      setSavedSnapshots(
        Object.fromEntries(
          next.map((note) => [note.id, `${note.title}\n${noteText(note.content)}`]),
        ),
      );
    }),
  );

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const create = () => {
    if (!editable || pending) return;
    if (dirty) {
      setNextId("__new__");
      setConfirmSwitch(true);
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        const note = await createNote({
          project_id: project.id,
          title: "โน้ตใหม่",
          content: "",
        });
        setNotes((current) => [note, ...current]);
        setSavedSnapshots((current) => ({
          ...current,
          [note.id]: `${note.title}\n${noteText(note.content)}`,
        }));
        setSelectedId(note.id);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "สร้างโน้ตไม่สำเร็จ");
      }
    });
  };

  const choose = (id: string) => {
    if (id === selectedId) return;
    if (dirty) {
      setNextId(id);
      setConfirmSwitch(true);
    } else setSelectedId(id);
  };

  const discardAndSwitch = () => {
    if (selected) {
      const original = initial.find((note) => note.id === selected.id);
      const saved = savedSnapshots[selected.id];
      const split = saved?.indexOf("\n") ?? -1;
      if (original && split >= 0)
        setNotes((current) =>
          current.map((note) =>
            note.id === selected.id
              ? { ...note, title: saved.slice(0, split), content: saved.slice(split + 1) }
              : note,
          ),
        );
    }
    const target = nextId;
    setConfirmSwitch(false);
    setNextId("");
    if (target === "__new__") window.setTimeout(create, 0);
    else setSelectedId(target);
  };

  const patch = (input: { title?: string; content?: string }) => {
    if (editable && selected && !pending)
      setNotes((current) =>
        current.map((note) => (note.id === selected.id ? { ...note, ...input } : note)),
      );
  };

  const save = useCallback(
    (notify = true) => {
      if (!editable || !selected || !(selected.title ?? "").trim() || pending) return;
      const savingSnapshot = `${selected.title ?? ""}\n${noteText(selected.content)}`;
      setError("");
      startTransition(async () => {
        try {
          const updated = await updateNote(selected.id, {
            title: selected.title ?? "",
            content: noteText(selected.content),
          });
          setNotes((current) =>
            current.map((note) => {
              if (note.id !== updated.id) return note;
              const currentSnapshot = `${note.title}\n${noteText(note.content)}`;
              return currentSnapshot === savingSnapshot
                ? updated
                : { ...updated, title: note.title, content: note.content };
            }),
          );
          setSavedSnapshots((current) => ({
            ...current,
            [updated.id]: `${updated.title}\n${noteText(updated.content)}`,
          }));
          if (notify) toast("บันทึกโน้ตแล้ว");
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "บันทึกโน้ตไม่สำเร็จ");
        }
      });
    },
    [editable, pending, selected, setError, setNotes, setSavedSnapshots, startTransition, toast],
  );

  useEffect(() => {
    if (!dirty || pending || !(selected?.title ?? "").trim()) return;
    const timer = window.setTimeout(() => save(false), 1000);
    return () => window.clearTimeout(timer);
  }, [dirty, pending, save, selected?.title]);

  const saveShortcut = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (dirty) save();
    }
  };

  const editorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    saveShortcut(event);
    if (event.key !== "Tab" || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    const start = event.currentTarget.selectionStart;
    const end = event.currentTarget.selectionEnd;
    const content = noteText(selected?.content ?? "");
    patch({ content: `${content.slice(0, start)}\t${content.slice(end)}` });
    window.requestAnimationFrame(() => {
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(start + 1, start + 1);
    });
  };

  return (
    <>
      <div className="heading">
        <div>
          <small>โน้ต</small>
          <h1>{project.name}</h1>
          <p>บันทึกอัตโนมัติหลังหยุดพิมพ์ หรือกด Ctrl/Cmd + S เพื่อบันทึกทันที</p>
        </div>
        <Button type="button" variant="primary" onClick={create} loading={pending}>
          สร้างโน้ต
        </Button>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className={`notes-grid connected-notes ${selected ? "has-selection" : ""}`}>
        <aside className="panel note-list">
          <div className="note-list-header">
            <h2>โน้ตทั้งหมด</h2>
            <Badge tone="neutral">{notes.length}</Badge>
          </div>
          <div className="note-list-items">
            {notes.map((note) => (
              <Button
                variant="ghost"
                className={`note-item ${note.id === selectedId ? "active" : ""}`}
                key={note.id}
                onClick={() => choose(note.id)}
              >
                <b>{note.title || "ไม่มีชื่อ"}</b>
                <small>
                  {note.created_at
                    ? new Date(note.created_at).toLocaleDateString("th-TH")
                    : "ไม่ทราบวันที่"}
                </small>
              </Button>
            ))}
            {!notes.length && (
              <EmptyState
                title="ยังไม่มีโน้ต"
                description="สร้างโน้ตแรกเพื่อเก็บบริบทของโปรเจกต์"
              />
            )}
          </div>
        </aside>

        <section className="note-editor-shell">
          {selected ? (
            <>
              <div className="note-editor-header">
                <Button
                  className="note-mobile-back"
                  variant="ghost"
                  size="sm"
                  onClick={() => choose("")}
                >
                  กลับ
                </Button>
                <Input
                  className="note-title-input"
                  aria-label="ชื่อโน้ต"
                  value={selected.title ?? ""}
                  onChange={(event) => patch({ title: event.target.value })}
                  onKeyDown={saveShortcut}
                  required
                />
                <span
                  className={`save-state ${pending ? "" : dirty ? "dirty" : "saved"}`}
                  aria-live="polite"
                >
                  {pending ? "กำลังบันทึก…" : dirty ? "รอบันทึกอัตโนมัติ" : "อัปเดตแล้ว"}
                </span>
                <Button
                  className="note-save-button"
                  onClick={() => save()}
                  loading={pending}
                  disabled={!dirty || !(selected.title ?? "").trim()}
                >
                  บันทึก
                </Button>
              </div>
              <Textarea
                ref={editorRef}
                aria-label="เนื้อหาโน้ต"
                className="note-editor-textarea"
                value={noteText(selected.content)}
                onChange={(event) => patch({ content: event.target.value })}
                onKeyDown={editorKeyDown}
                placeholder="เริ่มเขียนบริบท แนวคิด หรือรายละเอียดทางเทคนิค…"
              />
            </>
          ) : (
            <div className="empty-editor">
              <EmptyState
                title="เลือกโน้ตเพื่อเริ่มเขียน"
                description="หรือสร้างโน้ตใหม่สำหรับโปรเจกต์นี้"
                action={
                  <Button variant="primary" onClick={create}>
                    สร้างโน้ต
                  </Button>
                }
              />
            </div>
          )}
        </section>
      </div>

      <Modal
        open={confirmSwitch}
        onClose={() => setConfirmSwitch(false)}
        title="ยังไม่ได้บันทึกการแก้ไข"
        description="หากเปลี่ยนโน้ตตอนนี้ การแก้ไขล่าสุดจะหายไป"
        footer={
          <>
            <Button onClick={() => setConfirmSwitch(false)}>เขียนต่อ</Button>
            <Button variant="danger" onClick={discardAndSwitch}>
              ละทิ้งและเปลี่ยน
            </Button>
          </>
        }
      >
        <p>บันทึกโน้ตนี้ก่อนเพื่อเก็บการเปลี่ยนแปลงอย่างปลอดภัย</p>
      </Modal>
    </>
  );
}

export function ConnectedActivity({
  project,
  activities,
  repositoryActivities = [],
}: {
  project: Project;
  activities: Activity[];
  repositoryActivities?: ProjectActivity[];
}) {
  const items = [
    ...activities.map((item) => ({
      id: `activity:${item.id}`,
      title: `${item.action} ${item.entity_type}`,
      date: item.created_at,
    })),
    ...repositoryActivities.map((item) => ({
      id: `repository:${item.id}`,
      title: item.title,
      date: item.occurred_at,
    })),
  ].sort(
    (left, right) =>
      new Date(right.date ?? 0).getTime() - new Date(left.date ?? 0).getTime(),
  );

  return (
    <>
      <div className="heading">
        <div>
          <small>กิจกรรม</small>
          <h1>{project.name}</h1>
          <p>ประวัติการเปลี่ยนแปลงของโปรเจกต์</p>
        </div>
      </div>
      <section className="panel feature-panel">
        <div className="timeline">
          {items.map((item) => (
            <div key={item.id}>
              <span />
              <section>
                <b>{item.title}</b>
                <small>
                  {item.date
                    ? new Date(item.date).toLocaleString("th-TH")
                    : "ไม่ทราบเวลา"}
                </small>
              </section>
            </div>
          ))}
          {!items.length && <p className="empty-copy">ยังไม่มีกิจกรรม</p>}
        </div>
      </section>
    </>
  );
}

export function ConnectedBoard({
  project,
  initial,
  role = "owner",
}: {
  project: Project;
  initial: Task[];
  role?: string;
}) {
  const statuses = ["todo", "in_progress", "review", "done"] as const;
  const labels = { todo: "รอทำ", in_progress: "กำลังทำ", review: "ตรวจสอบ", done: "เสร็จแล้ว" };
  const [tasks, setTasks] = useState(initial);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dragging, setDragging] = useState("");
  const [over, setOver] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const editable = canEditProject(role);

  useProjectRealtime("tasks", project.id, () => void getTasks(project.id).then(setTasks));

  const move = (taskId: string, status: string) => {
    if (!editable || pending) return;
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === status) return;
    setError("");
    setTasks((current) =>
      current.map((item) => (item.id === taskId ? { ...item, status } : item)),
    );
    startTransition(async () => {
      try {
        const updated = await updateTask(
          taskId,
          { status },
          `ย้ายงานไป ${labels[status as keyof typeof labels]}`,
        );
        setTasks((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } catch (cause) {
        setTasks((current) =>
          current.map((item) => (item.id === taskId ? task : item)),
        );
        setError(cause instanceof Error ? cause.message : "ย้ายงานไม่สำเร็จ");
      }
    });
  };

  const cardColor = (id: string) =>
    [...id].reduce((total, character) => total + character.charCodeAt(0), 0) % 5;

  return (
    <>
      <div className="heading">
        <div>
          <small>บอร์ด</small>
          <h1>{project.name}</h1>
          <p>ลากการ์ดหรือคลิกการ์ดเพื่อดูรายละเอียดและแก้ไข</p>
        </div>
        <Link className="view-board" href="/checklists">
          ดูแบบรายการ
        </Link>
      </div>
      {!editable && (
        <p className="form-hint" role="status">
          คุณมีสิทธิ์อ่านอย่างเดียวในโปรเจกต์นี้
        </p>
      )}
      {error && (
        <p className="form-error board-error" role="alert">
          {error}
        </p>
      )}
      <div className="kanban">
        {statuses.map((status) => (
          <section
            className={over === status ? "drop-active" : ""}
            key={status}
            onDragOver={(event) => {
              event.preventDefault();
              if (editable) setOver(status);
            }}
            onDragLeave={() => setOver("")}
            onDrop={(event) => {
              event.preventDefault();
              move(event.dataTransfer.getData("text/plain"), status);
              setDragging("");
              setOver("");
            }}
          >
            <div className="column-title">
              <h2>{labels[status]}</h2>
              <span>{tasks.filter((task) => task.status === status).length}</span>
            </div>
            {tasks
              .filter((task) => task.status === status)
              .map((task) => (
                <article
                  className={`board-card board-card-color-${cardColor(task.id)} ${
                    dragging === task.id ? "dragging" : ""
                  }`}
                  draggable={editable && !pending}
                  key={task.id}
                  onDragStart={(event) => {
                    if (!editable) return;
                    event.dataTransfer.setData("text/plain", task.id);
                    setDragging(task.id);
                  }}
                  onDragEnd={() => {
                    setDragging("");
                    setOver("");
                  }}
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).tagName.toLowerCase() === "select") return;
                    setSelectedTask(task);
                  }}
                >
                  <div className="board-card-head">
                    <small className={`priority ${priorityClass(task.priority)}`}>
                      {priorityLabel(task.priority)}
                    </small>
                    <span className="board-card-grip">ลากเพื่อย้าย</span>
                  </div>
                  <b>{task.title}</b>
                  {task.description && (
                    <span className="board-card-description">{task.description}</span>
                  )}
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      flexWrap: "wrap",
                      fontSize: "11px",
                      color: "var(--muted)",
                      margin: "4px 0",
                    }}
                  >
                    {task.due_date && <span>กำหนดส่ง: {task.due_date}</span>}
                    {task.branch_name && <span>สาขา: {task.branch_name}</span>}
                    {task.linked_pull_request_number && (
                      <span>PR #{task.linked_pull_request_number}</span>
                    )}
                  </div>
                  <Select
                    disabled={!editable || pending}
                    aria-label={`ย้าย ${task.title}`}
                    value={task.status}
                    onChange={(event) => move(task.id, event.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="todo">รอทำ</option>
                    <option value="in_progress">กำลังทำ</option>
                    <option value="review">ตรวจสอบ</option>
                    <option value="done">เสร็จแล้ว</option>
                  </Select>
                </article>
              ))}
          </section>
        ))}
      </div>

      <TaskDetailModal
        task={selectedTask}
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        editable={editable}
        onUpdate={(updated) =>
          setTasks((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          )
        }
        onDelete={(id) => setTasks((current) => current.filter((item) => item.id !== id))}
      />
    </>
  );
}

export function ConnectedSearch({ project }: { project: Project }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchWorkspace(project.id, query);
        setResults(data);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, project.id]);

  return (
    <>
      <div className="heading">
        <div>
          <small>ค้นหาในโปรเจกต์</small>
          <h1>{project.name}</h1>
          <p>ค้นหาทั้งงาน โน้ต ผังงาน และประวัติกิจกรรมจากฐานข้อมูลจริง</p>
        </div>
      </div>

      <Card className="feature-panel" style={{ padding: "20px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="พิมพ์คำค้นหา เช่น ชื่อฟีเจอร์, งานที่ต้องทำ, บันทึก..."
            autoFocus
          />
        </div>

        {isSearching && (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>
            <span className="ui-spinner" style={{ marginRight: "8px", verticalAlign: "middle" }} />
            กำลังค้นหา...
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <div className="search-results-list" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {results.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  textDecoration: "none",
                  backgroundColor: "var(--surface)",
                  transition: "background-color 0.15s ease, border-color 0.15s ease",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <b style={{ color: "var(--ink)" }}>{item.title}</b>
                  {item.subtitle && <small style={{ color: "var(--muted)" }}>{item.subtitle}</small>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Badge tone={item.type === "task" ? "brand" : item.type === "note" ? "neutral" : "warning"}>
                    {item.typeLabel}
                  </Badge>
                  {item.date && (
                    <small style={{ color: "var(--muted)" }}>
                      {new Date(item.date).toLocaleDateString("th-TH")}
                    </small>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isSearching && hasSearched && results.length === 0 && (
          <EmptyState
            title="ไม่พบผลลัพธ์ที่ตรงกัน"
            description={`ไม่มีรายการใดตรงกับ "${query}" ในโปรเจกต์นี้`}
          />
        )}

        {!isSearching && !hasSearched && !query && (
          <EmptyState
            title="เริ่มค้นหา"
            description="ค้นหาข้อมูลทั้งหมดใน Workspace ได้อย่างรวดเร็ว"
          />
        )}
      </Card>
    </>
  );
}

export function ConnectedInbox({ project, initialIdeas = [], role = "owner" }: { project: Project; initialIdeas?: IdeaItem[]; role?: string }) {
  const [ideas, setIdeas] = useState<IdeaItem[]>(initialIdeas);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const editable = canEditProject(role);

  useProjectRealtime("activities", project.id, () => {
    void getIdeas(project.id).then(setIdeas);
  });

  const save = () => {
    if (!editable || !text.trim() || pending) return;
    setError("");
    setSuccess("");
    startTransition(async () => {
      try {
        const idea = await createIdea(project.id, text);
        setIdeas((current) => [idea, ...current]);
        setText("");
        setSuccess("บันทึกไอเดียเรียบร้อยแล้ว");
        setTimeout(() => setSuccess(""), 3000);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "บันทึกไอเดียไม่สำเร็จ");
      }
    });
  };

  const remove = (id: string) => {
    if (!editable || pending) return;
    setError("");
    startTransition(async () => {
      try {
        await deleteIdea(id);
        setIdeas((current) => current.filter((item) => item.id !== id));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "ลบไอเดียไม่สำเร็จ");
      }
    });
  };

  const toTask = (idea: IdeaItem) => {
    if (!editable || pending) return;
    setError("");
    setSuccess("");
    startTransition(async () => {
      try {
        await convertIdeaToTask(idea.id, project.id, idea.text);
        setIdeas((current) => current.filter((item) => item.id !== idea.id));
        setSuccess("แปลงไอเดียเป็น Task เรียบร้อยแล้ว (ตรวจสอบได้ที่หน้ารายการงาน)");
        setTimeout(() => setSuccess(""), 4000);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "แปลงไอเดียเป็นงานไม่สำเร็จ");
      }
    });
  };

  const toNote = (idea: IdeaItem) => {
    if (!editable || pending) return;
    setError("");
    setSuccess("");
    startTransition(async () => {
      try {
        await convertIdeaToNote(idea.id, project.id, idea.text);
        setIdeas((current) => current.filter((item) => item.id !== idea.id));
        setSuccess("แปลงไอเดียเป็น Note เรียบร้อยแล้ว (ตรวจสอบได้ที่หน้าโน้ต)");
        setTimeout(() => setSuccess(""), 4000);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "แปลงไอเดียเป็นโน้ตไม่สำเร็จ");
      }
    });
  };

  return (
    <>
      <div className="heading">
        <div>
          <small>กล่องรับไอเดีย</small>
          <h1>{project.name}</h1>
          <p>บันทึกไอเดีย ข้อผิดพลาด หรือความคิดด่วนลงฐานข้อมูล และสามารถแปลงเป็นงานหรือโน้ตได้ทันที</p>
        </div>
      </div>

      {!editable && <p className="form-hint" role="status">คุณมีสิทธิ์อ่านอย่างเดียวในโปรเจกต์นี้</p>}
      {error && <p className="form-error" role="alert" style={{ marginBottom: "16px" }}>{error}</p>}
      {success && <p className="form-success" role="status" style={{ marginBottom: "16px" }}>{success}</p>}

      {editable && (
        <Card className="capture" style={{ padding: "20px", marginBottom: "20px" }}>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="เขียนไอเดีย ข้อผิดพลาดที่เจอ ลิงก์ที่น่าสนใจ หรือสิ่งที่ต้องทำด่วน..."
            rows={3}
            disabled={pending}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
            <Button
              variant="primary"
              onClick={save}
              loading={pending}
              disabled={!text.trim()}
            >
              บันทึกไอเดีย
            </Button>
          </div>
        </Card>
      )}

      <Card className="feature-panel" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "16px", margin: 0 }}>ไอเดียทั้งหมด ({ideas.length})</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {ideas.map((item) => (
            <div
              key={item.id}
              className="idea-card-item"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                padding: "14px 16px",
                border: "1px solid var(--line)",
                borderRadius: "10px",
                backgroundColor: "var(--surface)",
              }}
            >
              <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--ink)", lineHeight: 1.5 }}>
                {item.text}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "10px",
                  borderTop: "1px solid var(--line)",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <small style={{ color: "var(--muted)" }}>
                  {item.created_at ? new Date(item.created_at).toLocaleString("th-TH") : ""}
                </small>

                {editable && (
                  <div style={{ display: "flex", gap: "6px" }}>
                    <Button size="sm" variant="secondary" onClick={() => toTask(item)} disabled={pending}>
                      แปลงเป็น Task
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => toNote(item)} disabled={pending}>
                      แปลงเป็น Note
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => remove(item.id)} disabled={pending}>
                      ลบ
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {!ideas.length && (
            <EmptyState
              title="ยังไม่มีไอเดียในกล่อง"
              description="บันทึกไอเดียแรกของคุณด้านบน เพื่อไม่ให้ความคิดดีๆ สูญหาย"
            />
          )}
        </div>
      </Card>
    </>
  );
}

export function ConnectedTemplates({ project, role = "owner" }: { project: Project; role?: string }) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(null);
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const editable = canEditProject(role);

  const apply = (template: TemplateData) => {
    if (!editable || pending) return;
    setError("");
    setSuccess("");
    startTransition(async () => {
      try {
        const result = await applyTemplate(project.id, template.id);
        setSuccess(`นำเข้าแม่แบบ "${template.title}" เรียบร้อยแล้ว! (สร้าง 1 Note และ ${result.tasksCount} Tasks)`);
        setSelectedTemplate(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "นำเข้าแม่แบบไม่สำเร็จ");
      }
    });
  };

  return (
    <>
      <div className="heading">
        <div>
          <small>แม่แบบมาตรฐาน</small>
          <h1>{project.name}</h1>
          <p>เลือกใช้แม่แบบเอกสารและชุดงานมาตรฐาน เพื่อเริ่มต้นการทำงานได้อย่างรวดเร็วและเป็นระบบ</p>
        </div>
      </div>

      {!editable && <p className="form-hint" role="status">คุณมีสิทธิ์อ่านอย่างเดียวในโปรเจกต์นี้</p>}
      {error && <p className="form-error" role="alert" style={{ marginBottom: "16px" }}>{error}</p>}
      {success && <p className="form-success" role="status" style={{ marginBottom: "16px" }}>{success}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
        {BUILTIN_TEMPLATES.map((tmpl, index) => (
          <Card as="article" key={tmpl.id} style={{ display: "flex", flexDirection: "column", padding: "20px", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Badge tone="brand">{tmpl.category}</Badge>
              <small style={{ color: "var(--muted)" }}>#{String(index + 1).padStart(2, "0")}</small>
            </div>

            <div>
              <h2 style={{ fontSize: "16px", margin: "0 0 6px" }}>{tmpl.title}</h2>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: 1.5 }}>
                {tmpl.description}
              </p>
            </div>

            <div style={{ marginTop: "auto", paddingTop: "12px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <small style={{ color: "var(--muted)" }}>
                1 โน้ต · {tmpl.tasks.length} งาน
              </small>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button size="sm" variant="ghost" onClick={() => setSelectedTemplate(tmpl)}>
                  ดูตัวอย่าง
                </Button>
                {editable && (
                  <Button size="sm" variant="primary" onClick={() => apply(tmpl)} loading={pending}>
                    ใช้งาน
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedTemplate && (
        <Modal
          open={Boolean(selectedTemplate)}
          onClose={() => setSelectedTemplate(null)}
          title={`ตัวอย่างแม่แบบ: ${selectedTemplate.title}`}
          description={selectedTemplate.description}
          footer={
            <>
              <Button variant="secondary" onClick={() => setSelectedTemplate(null)}>
                ปิด
              </Button>
              {editable && (
                <Button variant="primary" onClick={() => apply(selectedTemplate)} loading={pending}>
                  นำเข้าแม่แบบนี้สู่โปรเจกต์
                </Button>
              )}
            </>
          }
        >
          <div style={{ display: "grid", gap: "16px", padding: "4px 0" }}>
            <div>
              <b style={{ color: "var(--brand)", fontSize: "12px", textTransform: "uppercase" }}>📋 Tasks ที่จะถูกสร้าง:</b>
              <ul style={{ margin: "8px 0 0", paddingLeft: "20px", display: "grid", gap: "6px", fontSize: "13px" }}>
                {selectedTemplate.tasks.map((t, idx) => (
                  <li key={idx}>
                    <b>{t.title}</b> <small style={{ color: "var(--muted)" }}>({t.priority})</small>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
              <b style={{ color: "var(--brand)", fontSize: "12px", textTransform: "uppercase" }}>📝 โครงสร้าง Note ตัวอย่าง:</b>
              <pre
                style={{
                  margin: "8px 0 0",
                  padding: "12px",
                  borderRadius: "8px",
                  backgroundColor: "var(--surface-2)",
                  fontSize: "12px",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  fontFamily: "monospace",
                  maxHeight: "260px",
                  overflowY: "auto",
                }}
              >
                {selectedTemplate.noteContent}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export function ConnectedContextMap({ initialData }: { initialData: ContextMapData }) {
  const [selectedEntity, setSelectedEntity] = useState<{ type: string; title: string; details?: string; link?: string } | null>({
    type: "project",
    title: initialData.project.name,
    details: `ศูนย์กลางของ Workspace มีสมาชิกทั้งหมด ${initialData.membersCount} คน`,
    link: "/dashboard",
  });

  return (
    <>
      <div className="heading">
        <div>
          <small>แผนที่บริบทโปรเจกต์ (Context Map)</small>
          <h1>{initialData.project.name}</h1>
          <p>แผนภาพแสดงความเชื่อมโยงของ Repository, Note, Task, และ Flowchart ในระบบจริง</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "16px", minHeight: "550px" }}>
        <Card
          className="feature-panel"
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            backgroundImage: "radial-gradient(var(--line) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            position: "relative",
            overflow: "auto",
          }}
        >
          {/* Central Project Node */}
          <div
            onClick={() =>
              setSelectedEntity({
                type: "project",
                title: initialData.project.name,
                details: `โปรเจกต์หลักที่รวมทุกการทำงาน สมาชิก: ${initialData.membersCount} คน`,
                link: "/dashboard",
              })
            }
            style={{
              padding: "16px 28px",
              borderRadius: "12px",
              backgroundColor: "var(--brand)",
              color: "#fff",
              fontWeight: 800,
              fontSize: "16px",
              boxShadow: "0 8px 24px rgba(8, 122, 85, 0.25)",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            {initialData.project.name}
          </div>

          <div style={{ width: "2px", height: "24px", backgroundColor: "var(--brand)" }} />

          {/* Categories Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", width: "100%" }}>
            {/* Repositories Section */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
              <Badge tone="brand">Repositories ({initialData.repositories.length})</Badge>
              {initialData.repositories.map((repo) => (
                <button
                  key={repo.id}
                  type="button"
                  className="context-node-btn"
                  onClick={() =>
                    setSelectedEntity({
                      type: "repository",
                      title: `${repo.owner}/${repo.name}`,
                      details: "GitHub Repository ที่เชื่อมต่ออยู่ พร้อมระบบ Timeline และ Sync",
                      link: `/projects/${initialData.project.id}/repositories/${repo.id}`,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    backgroundColor: "var(--surface)",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "center",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {repo.name}
                </button>
              ))}
              {!initialData.repositories.length && <small style={{ color: "var(--muted)" }}>ไม่มี Repo</small>}
            </div>

            {/* Notes Section */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
              <Badge tone="neutral">Notes ({initialData.notes.length})</Badge>
              {initialData.notes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  className="context-node-btn"
                  onClick={() =>
                    setSelectedEntity({
                      type: "note",
                      title: note.title,
                      details: "เอกสาร / บันทึกข้อมูลสำหรับโปรเจกต์",
                      link: "/notes",
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    backgroundColor: "var(--surface)",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "center",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {note.title}
                </button>
              ))}
              {!initialData.notes.length && <small style={{ color: "var(--muted)" }}>ไม่มีโน้ต</small>}
            </div>

            {/* Tasks Section */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
              <Badge tone="warning">Tasks ({initialData.tasks.length})</Badge>
              {initialData.tasks.slice(0, 5).map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className="context-node-btn"
                  onClick={() =>
                    setSelectedEntity({
                      type: "task",
                      title: task.title,
                      details: `สถานะ: ${task.status} | ความสำคัญ: ${task.priority}`,
                      link: "/checklists",
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    backgroundColor: "var(--surface)",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "center",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {task.title}
                </button>
              ))}
              {!initialData.tasks.length && <small style={{ color: "var(--muted)" }}>ไม่มีงาน</small>}
            </div>

            {/* Flowcharts Section */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
              <Badge tone="brand">Flowcharts ({initialData.flowcharts.length})</Badge>
              {initialData.flowcharts.map((fc) => (
                <button
                  key={fc.id}
                  type="button"
                  className="context-node-btn"
                  onClick={() =>
                    setSelectedEntity({
                      type: "flowchart",
                      title: fc.name,
                      details: "ผังงานสถาปัตยกรรมและ Logic ไหลลื่นของระบบ",
                      link: `/projects/${initialData.project.id}/flowcharts/${fc.id}`,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    backgroundColor: "var(--surface)",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "center",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {fc.name}
                </button>
              ))}
              {!initialData.flowcharts.length && <small style={{ color: "var(--muted)" }}>ไม่มีผังงาน</small>}
            </div>
          </div>
        </Card>

        {/* Entity Inspector Side Panel */}
        <Card className="feature-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <h2 style={{ fontSize: "16px", margin: 0 }}>รายละเอียด Entity</h2>

          {selectedEntity ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <Badge tone="brand">{selectedEntity.type.toUpperCase()}</Badge>
                <h3 style={{ margin: "8px 0 4px", fontSize: "16px" }}>{selectedEntity.title}</h3>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: 1.5 }}>
                  {selectedEntity.details}
                </p>
              </div>

              {selectedEntity.link && (
                <Link
                  href={selectedEntity.link}
                  className="ui-button ui-button-primary"
                  style={{ textDecoration: "none", marginTop: "12px", textAlign: "center" }}
                >
                  เปิดหน้านี้ทันที
                </Link>
              )}
            </div>
          ) : (
            <EmptyState
              title="เลือก Entity"
              description="คลิกที่องค์ประกอบในแผนภาพเพื่อดูความสัมพันธ์และข้อมูลเชิงลึก"
            />
          )}
        </Card>
      </div>
    </>
  );
}

export function ConnectedAiTools({ project, role = "owner" }: { project: Project; role?: string }) {
  const [requirementText, setRequirementText] = useState("");
  const [analyzing, startAnalyzing] = useTransition();
  const [creating, startCreating] = useTransition();
  const [analysisResult, setAnalysisResult] = useState<{ summary: string; tasks: AiGeneratedTask[] } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const editable = canEditProject(role);

  const analyze = () => {
    if (!requirementText.trim() || analyzing) return;
    setError("");
    setSuccess("");
    startAnalyzing(async () => {
      try {
        const result = await aiAnalyzeRequirement(requirementText);
        setAnalysisResult(result);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "วิเคราะห์ Requirement ไม่สำเร็จ");
      }
    });
  };

  const createTasks = () => {
    if (!editable || !analysisResult || creating) return;
    setError("");
    setSuccess("");
    startCreating(async () => {
      try {
        const created = await aiCreateTasksFromRequirement(project.id, analysisResult.tasks);
        setSuccess(`สร้าง ${created.length} Tasks ลงในโปรเจกต์เรียบร้อยแล้ว! สามารถเปิดดูได้ที่หน้ารายการงาน`);
        setAnalysisResult(null);
        setRequirementText("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "สร้างงานจาก Requirement ไม่สำเร็จ");
      }
    });
  };

  return (
    <>
      <div className="heading">
        <div>
          <small>เครื่องมือผู้ช่วย AI (AI Developer Tools)</small>
          <h1>{project.name}</h1>
          <p>แปลงโจทย์/ข้อกำหนด (Requirement) ให้เป็นขั้นตอนการพัฒนา (Tasks) และโครงสร้างงานอัตโนมัติ</p>
        </div>
      </div>

      {!editable && <p className="form-hint" role="status">คุณมีสิทธิ์อ่านอย่างเดียวในโปรเจกต์นี้</p>}
      {error && <p className="form-error" role="alert" style={{ marginBottom: "16px" }}>{error}</p>}
      {success && <p className="form-success" role="status" style={{ marginBottom: "16px" }}>{success}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px" }}>
        {/* Input Form */}
        <Card className="feature-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <h2 style={{ fontSize: "16px", margin: 0 }}>ป้อนโจทย์หรือข้อกำหนด (Requirement Prompt)</h2>
          <Textarea
            value={requirementText}
            onChange={(e) => setRequirementText(e.target.value)}
            placeholder="ตัวอย่าง: ต้องการเพิ่มระบบล็อกอินด้วย Google OAuth พร้อมระบบบันทึก Session และจำกัดสิทธิ์ผู้ใช้ตาม Role..."
            rows={8}
            disabled={analyzing || creating}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <Button
              variant="primary"
              onClick={analyze}
              loading={analyzing}
              disabled={!requirementText.trim()}
            >
              วิเคราะห์และแยกย่อย Tasks
            </Button>
          </div>
        </Card>

        {/* AI Output Preview Panel */}
        <Card className="feature-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <h2 style={{ fontSize: "16px", margin: 0 }}>ผลการวิเคราะห์จาก AI</h2>

          {analysisResult ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "var(--brand-soft)", color: "var(--brand)", fontSize: "13px" }}>
                <b>สรุปการวิเคราะห์:</b>
                <p style={{ margin: "4px 0 0" }}>{analysisResult.summary}</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <b style={{ fontSize: "13px" }}>Tasks ที่แนะนำ ({analysisResult.tasks.length} รายการ):</b>
                {analysisResult.tasks.map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "10px 12px",
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      backgroundColor: "var(--surface)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <b style={{ fontSize: "13px" }}>{t.title}</b>
                      <Badge tone={t.priority === "สำคัญมาก" ? "danger" : "neutral"}>{t.priority}</Badge>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--muted)" }}>{t.description}</p>
                  </div>
                ))}
              </div>

              {editable && (
                <Button
                  variant="primary"
                  onClick={createTasks}
                  loading={creating}
                  style={{ width: "100%", marginTop: "8px" }}
                >
                  นำเข้า Tasks ทั้งหมดเข้าสู่โปรเจกต์
                </Button>
              )}
            </div>
          ) : (
            <EmptyState
              title="ยังไม่มีการวิเคราะห์"
              description="ป้อนข้อกำหนดทางด้านซ้าย แล้วกดปุ่มวิเคราะห์เพื่อเริ่มกระบวนการ"
            />
          )}
        </Card>
      </div>
    </>
  );
}



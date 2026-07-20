"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createNote, createProject, createTask, getNotes, getTasks, updateNote, updateTask } from "@/app/actions/data";
import { Badge, Button, Card, EmptyState, FormField, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
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

export function ConnectedDashboard({ project, tasks, activities, displayName }: { project: Project; tasks: Task[]; activities: Activity[]; displayName?: string }) {
  const completed = tasks.filter(task => task.status === "done").length;
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  const openTasks = tasks.length - completed;
  const inReview = tasks.filter(task => task.status === "review").length;
  const healthLabel = tasks.length === 0 ? "เริ่มต้นโปรเจกต์" : progress >= 75 ? "ใกล้เสร็จแล้ว" : progress >= 40 ? "กำลังดำเนินการ" : "อยู่ในช่วงเริ่มต้น";
  return <><section className="project-hero"><div><Badge tone="brand">{project.status === "active" ? "กำลังดำเนินการ" : project.status ?? "ไม่ระบุสถานะ"}</Badge><h1>{project.name}</h1><p>{displayName ? `สวัสดี ${displayName} — ` : ""}ติดตามงานและกิจกรรมล่าสุดของโปรเจกต์นี้</p></div><div className="hero-actions"><Link href="/notes">เปิดโน้ต</Link><Link className="task-action-link" href="/checklists">ดูงาน</Link></div></section><nav className="project-tabs" aria-label="เมนูภายในโปรเจกต์"><Link className="active" href="/dashboard">ภาพรวม</Link><Link href="/notes">โน้ต</Link><Link href="/checklists">งาน</Link><Link href="/settings/integrations">Repository</Link><Link href="/activity">กิจกรรม</Link></nav><section className="overview-stats" aria-label="สรุปสถานะงาน"><article><span>งานทั้งหมด</span><b>{tasks.length}</b><small>งานทุกสถานะในโปรเจกต์</small></article><article><span>งานที่เปิดอยู่</span><b>{openTasks}</b><small>งานที่ยังไม่เสร็จ</small></article><article><span>เสร็จแล้ว</span><b>{completed}</b><small>งานที่ปิดเรียบร้อย</small></article><article className="overview-progress-stat"><span>ความคืบหน้า</span><b>{progress}%</b><small>คำนวณจากงานที่เสร็จทั้งหมด</small><div className="overview-progress-track" role="progressbar" aria-label="ความคืบหน้าของโปรเจกต์" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></div></article></section><div className="cockpit-grid"><section className="cockpit-main"><div className="section-head"><div><h2>งานล่าสุด</h2></div><Link href="/checklists">ดูงานทั้งหมด</Link></div><div className="focus-list">{tasks.length ? tasks.slice(0, 5).map((task, index) => <article key={task.id}><span className={task.status === "done" ? "task-index done" : "task-index"}>{task.status === "done" ? "เสร็จ" : String(index + 1).padStart(2, "0")}</span><div><b>{task.title}</b><small>{task.status} · {task.priority}</small></div></article>) : <p className="empty-copy">ยังไม่มีงานในโปรเจกต์นี้</p>}</div><div className="section-head activity-head"><div><h2>กิจกรรมล่าสุด</h2></div><Link href="/activity">ดูประวัติทั้งหมด</Link></div><div className="compact-activity">{activities.slice(0, 3).map(item => <article key={item.id}><i>{item.entity_type.slice(0, 2).toUpperCase()}</i><div><b>{item.action} {item.entity_type}</b><small>{item.created_at ? new Date(item.created_at).toLocaleString("th-TH") : "ไม่ทราบเวลา"}</small></div></article>)}{!activities.length && <p className="empty-copy">ยังไม่มีกิจกรรม</p>}</div></section><aside className="cockpit-side"><Card className="project-health"><div className="section-head"><div><h2>{healthLabel}</h2></div><strong>{progress}%</strong></div><div className="progress" role="progressbar" aria-label="สุขภาพโปรเจกต์" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></div><dl><div><dt>งานที่เปิดอยู่</dt><dd>{openTasks}</dd></div><div><dt>กำลังตรวจสอบ</dt><dd>{inReview}</dd></div><div><dt>กิจกรรมล่าสุด</dt><dd>{activities.length}</dd></div></dl><Link className="project-health-link" href="/checklists">จัดการงาน</Link></Card></aside></div></>;
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

export function ConnectedTasks({ project, initial, role = "owner" }: { project: Project; initial: Task[]; role?: string }) {
  const [tasks, setTasks] = useState(initial);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("ทั่วไป");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const editable = canEditProject(role);
  void editable;
  useProjectRealtime("tasks", project.id, () => void getTasks(project.id).then(setTasks));
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setError("");
    startTransition(async () => {
      try {
        const task = await createTask({ project_id: project.id, title, description: "", status: "todo", priority });
        setTasks(current => [task, ...current]);
        setTitle("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "เพิ่มงานไม่สำเร็จ");
      }
    });
  };
  const toggle = (task: Task) => {
    const status = task.status === "done" ? "todo" : "done";
    setTasks(current => current.map(item => item.id === task.id ? { ...item, status } : item));
    startTransition(async () => {
      try {
        const updated = await updateTask(task.id, { status });
        setTasks(current => current.map(item => item.id === updated.id ? updated : item));
      } catch (cause) {
        setTasks(current => current.map(item => item.id === task.id ? task : item));
        setError(cause instanceof Error ? cause.message : "อัปเดตงานไม่สำเร็จ");
      }
    });
  };
  const changePriority = (task: Task, nextPriority: string) => {
    if (priorityLabel(task.priority) === nextPriority) return;
    setError("");
    setTasks(current => current.map(item => item.id === task.id ? { ...item, priority: nextPriority } : item));
    startTransition(async () => {
      try {
        const updated = await updateTask(task.id, { priority: nextPriority }, `เปลี่ยนความสำคัญเป็น ${nextPriority}`);
        setTasks(current => current.map(item => item.id === updated.id ? updated : item));
      } catch (cause) {
        setTasks(current => current.map(item => item.id === task.id ? task : item));
        setError(cause instanceof Error ? cause.message : "เปลี่ยนความสำคัญไม่สำเร็จ");
      }
    });
  };
  return <><div className="heading"><div><small>งาน</small><h1>{project.name}</h1><p>จัดลำดับความสำคัญและติดตามงานทั้งหมด</p></div><Link className="view-board" href="/board">ดูแบบบอร์ด</Link></div><section className="panel feature-panel"><div className="checklist">{tasks.map(task => <div className="task" key={task.id}><input aria-label={`ทำเครื่องหมาย ${task.title}`} type="checkbox" checked={task.status === "done"} onChange={() => toggle(task)} /><span className={task.status === "done" ? "strike" : ""}>{task.title}</span><Select className={`task-priority-select ${priorityClass(task.priority)}`} aria-label={`ความสำคัญของ ${task.title}`} value={priorityLabel(task.priority)} onChange={event => changePriority(task, event.target.value)}><option>ทั่วไป</option><option>สำคัญ</option><option>สำคัญมาก</option></Select></div>)}{!tasks.length && <p className="empty-copy">ยังไม่มีงาน</p>}{error && <p className="form-error" role="alert">{error}</p>}<form className="task-form" onSubmit={add}><Input aria-label="ชื่องาน" value={title} onChange={event => setTitle(event.target.value)} placeholder="เพิ่มงาน…" required /><Select aria-label="ความสำคัญ" value={priority} onChange={event => setPriority(event.target.value)}><option>ทั่วไป</option><option>สำคัญ</option><option>สำคัญมาก</option></Select><Button variant="primary" loading={pending}>เพิ่มงาน</Button></form></div></section></>;
}

function noteText(content: Note["content"]) { return typeof content === "string" ? content : JSON.stringify(content, null, 2); }

export function ConnectedNotes({ project, initial, role = "owner" }: { project: Project; initial: Note[]; role?: string }) {
  const [notes, setNotes] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? "");
  const [savedSnapshots, setSavedSnapshots] = useState(() => Object.fromEntries(initial.map(note => [note.id, `${note.title}\n${noteText(note.content)}`])));
  const [nextId, setNextId] = useState("");
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const selected = notes.find(note => note.id === selectedId);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();
  const editable = canEditProject(role);
  void editable;
  const snapshot = selected ? `${selected.title}\n${noteText(selected.content)}` : "";
  const dirty = Boolean(selected && savedSnapshots[selected.id] !== snapshot);
  useProjectRealtime("notes", project.id, () => void getNotes(project.id).then(next => {
    if (dirty) return;
    setNotes(next);
    setSavedSnapshots(Object.fromEntries(next.map(note => [note.id, `${note.title}\n${noteText(note.content)}`])));
  }));
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  const create = () => {
    if (dirty) { setNextId("__new__"); setConfirmSwitch(true); return; }
    setError("");
    startTransition(async () => {
      try {
        const note = await createNote({ project_id: project.id, title: "โน้ตใหม่", content: "" });
        setNotes(current => [note, ...current]);
        setSavedSnapshots(current => ({ ...current, [note.id]: `${note.title}\n${noteText(note.content)}` }));
        setSelectedId(note.id);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "สร้างโน้ตไม่สำเร็จ"); }
    });
  };
  const choose = (id: string) => { if (id === selectedId) return; if (dirty) { setNextId(id); setConfirmSwitch(true); } else setSelectedId(id); };
  const discardAndSwitch = () => {
    if (selected) {
      const original = initial.find(note => note.id === selected.id);
      const saved = savedSnapshots[selected.id];
      const split = saved?.indexOf("\n") ?? -1;
      if (original && split >= 0) setNotes(current => current.map(note => note.id === selected.id ? { ...note, title: saved.slice(0, split), content: saved.slice(split + 1) } : note));
    }
    const target = nextId;
    setConfirmSwitch(false);
    setNextId("");
    if (target === "__new__") window.setTimeout(create, 0); else setSelectedId(target);
  };
  const patch = (input: { title?: string; content?: string }) => { if (selected) setNotes(current => current.map(note => note.id === selected.id ? { ...note, ...input } : note)); };
  const save = useCallback((notify = true) => {
    if (!selected || !(selected.title ?? "").trim() || pending) return;
    const savingSnapshot = `${selected.title ?? ""}\n${noteText(selected.content)}`;
    setError("");
    startTransition(async () => {
      try {
        const updated = await updateNote(selected.id, { title: selected.title ?? "", content: noteText(selected.content) });
        setNotes(current => current.map(note => {
          if (note.id !== updated.id) return note;
          const currentSnapshot = `${note.title}\n${noteText(note.content)}`;
          return currentSnapshot === savingSnapshot ? updated : { ...updated, title: note.title, content: note.content };
        }));
        setSavedSnapshots(current => ({ ...current, [updated.id]: `${updated.title}\n${noteText(updated.content)}` }));
        if (notify) toast("บันทึกโน้ตแล้ว");
      } catch (cause) { setError(cause instanceof Error ? cause.message : "บันทึกโน้ตไม่สำเร็จ"); }
    });
  }, [pending, selected, setError, setNotes, setSavedSnapshots, startTransition, toast]);
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
  return <><div className="heading"><div><small>โน้ต</small><h1>{project.name}</h1><p>บันทึกอัตโนมัติหลังหยุดพิมพ์ หรือกด Ctrl/Cmd + S เพื่อบันทึกทันที</p></div><Button type="button" variant="primary" onClick={create} loading={pending}>สร้างโน้ต</Button></div>{error && <p className="form-error" role="alert">{error}</p>}<div className={`notes-grid connected-notes ${selected ? "has-selection" : ""}`}><aside className="panel note-list"><div className="note-list-header"><h2>โน้ตทั้งหมด</h2><Badge tone="neutral">{notes.length}</Badge></div><div className="note-list-items">{notes.map(note => <Button variant="ghost" className={`note-item ${note.id === selectedId ? "active" : ""}`} key={note.id} onClick={() => choose(note.id)}><b>{note.title || "ไม่มีชื่อ"}</b><small>{note.created_at ? new Date(note.created_at).toLocaleDateString("th-TH") : "ไม่ทราบวันที่"}</small></Button>)}{!notes.length && <EmptyState title="ยังไม่มีโน้ต" description="สร้างโน้ตแรกเพื่อเก็บบริบทของโปรเจกต์" />}</div></aside><section className="note-editor-shell">{selected ? <><div className="note-editor-header"><Button className="note-mobile-back" variant="ghost" size="sm" onClick={() => choose("")}>กลับ</Button><Input className="note-title-input" aria-label="ชื่อโน้ต" value={selected.title ?? ""} onChange={event => patch({ title: event.target.value })} onKeyDown={saveShortcut} required /><span className={`save-state ${pending ? "" : dirty ? "dirty" : "saved"}`} aria-live="polite">{pending ? "กำลังบันทึก…" : dirty ? "รอบันทึกอัตโนมัติ" : "อัปเดตแล้ว"}</span><Button className="note-save-button" onClick={() => save()} loading={pending} disabled={!dirty || !(selected.title ?? "").trim()}>บันทึก</Button></div><Textarea ref={editorRef} aria-label="เนื้อหาโน้ต" className="note-editor-textarea" value={noteText(selected.content)} onChange={event => patch({ content: event.target.value })} onKeyDown={editorKeyDown} placeholder="เริ่มเขียนบริบท แนวคิด หรือรายละเอียดทางเทคนิค…" /></> : <div className="empty-editor"><EmptyState title="เลือกโน้ตเพื่อเริ่มเขียน" description="หรือสร้างโน้ตใหม่สำหรับโปรเจกต์นี้" action={<Button variant="primary" onClick={create}>สร้างโน้ต</Button>} /></div>}</section></div><Modal open={confirmSwitch} onClose={() => setConfirmSwitch(false)} title="ยังไม่ได้บันทึกการแก้ไข" description="หากเปลี่ยนโน้ตตอนนี้ การแก้ไขล่าสุดจะหายไป" footer={<><Button onClick={() => setConfirmSwitch(false)}>เขียนต่อ</Button><Button variant="danger" onClick={discardAndSwitch}>ละทิ้งและเปลี่ยน</Button></>}><p>บันทึกโน้ตนี้ก่อนเพื่อเก็บการเปลี่ยนแปลงอย่างปลอดภัย</p></Modal></>;
}

export function ConnectedActivity({ project, activities, repositoryActivities = [] }: { project: Project; activities: Activity[]; repositoryActivities?: ProjectActivity[] }) {
  const items = [
    ...activities.map(item => ({ id: `activity:${item.id}`, title: `${item.action} ${item.entity_type}`, date: item.created_at })),
    ...repositoryActivities.map(item => ({ id: `repository:${item.id}`, title: item.title, date: item.occurred_at })),
  ].sort((left, right) => new Date(right.date ?? 0).getTime() - new Date(left.date ?? 0).getTime());
  return <><div className="heading"><div><small>กิจกรรม</small><h1>{project.name}</h1><p>ประวัติการเปลี่ยนแปลงของโปรเจกต์</p></div></div><section className="panel feature-panel"><div className="timeline">{items.map(item => <div key={item.id}><span /><section><b>{item.title}</b><small>{item.date ? new Date(item.date).toLocaleString("th-TH") : "ไม่ทราบเวลา"}</small></section></div>)}{!items.length && <p className="empty-copy">ยังไม่มีกิจกรรม</p>}</div></section></>;
}

export function ConnectedBoard({ project, initial, role = "owner" }: { project: Project; initial: Task[]; role?: string }) {
  const statuses = ["todo", "in_progress", "review", "done"] as const;
  const labels = { todo: "รอทำ", in_progress: "กำลังทำ", review: "ตรวจสอบ", done: "เสร็จแล้ว" };
  const [tasks, setTasks] = useState(initial);
  const [dragging, setDragging] = useState("");
  const [over, setOver] = useState("");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const editable = canEditProject(role);
  void editable;
  useProjectRealtime("tasks", project.id, () => void getTasks(project.id).then(setTasks));
  const move = (taskId: string, status: string) => {
    const task = tasks.find(item => item.id === taskId);
    if (!task || task.status === status) return;
    setError("");
    setTasks(current => current.map(item => item.id === taskId ? { ...item, status } : item));
    startTransition(async () => {
      try {
        const updated = await updateTask(taskId, { status }, `ย้ายงานไป ${labels[status as keyof typeof labels]}`);
        setTasks(current => current.map(item => item.id === updated.id ? updated : item));
      } catch (cause) {
        setTasks(current => current.map(item => item.id === taskId ? task : item));
        setError(cause instanceof Error ? cause.message : "ย้ายงานไม่สำเร็จ");
      }
    });
  };
  const cardColor = (id: string) => [...id].reduce((total, character) => total + character.charCodeAt(0), 0) % 5;
  return <><div className="heading"><div><small>บอร์ด</small><h1>{project.name}</h1><p>ลากการ์ดหรือเลือกสถานะ งานจะถูกบันทึกอัตโนมัติ</p></div><Link className="view-board" href="/checklists">ดูแบบรายการ</Link></div>{error && <p className="form-error board-error" role="alert">{error}</p>}<div className="kanban">{statuses.map(status => <section className={over === status ? "drop-active" : ""} key={status} onDragOver={event => { event.preventDefault(); setOver(status); }} onDragLeave={() => setOver("")} onDrop={event => { event.preventDefault(); move(event.dataTransfer.getData("text/plain"), status); setDragging(""); setOver(""); }}><div className="column-title"><h2>{labels[status]}</h2><span>{tasks.filter(task => task.status === status).length}</span></div>{tasks.filter(task => task.status === status).map(task => <article className={`board-card board-card-color-${cardColor(task.id)} ${dragging === task.id ? "dragging" : ""}`} draggable key={task.id} onDragStart={event => { event.dataTransfer.setData("text/plain", task.id); setDragging(task.id); }} onDragEnd={() => { setDragging(""); setOver(""); }}><div className="board-card-head"><small className={`priority ${priorityClass(task.priority)}`}>{priorityLabel(task.priority)}</small><span className="board-card-grip">ลากเพื่อย้าย</span></div><b>{task.title}</b>{task.description && <span className="board-card-description">{task.description}</span>}<Select aria-label={`ย้าย ${task.title}`} value={task.status} onChange={event => move(task.id, event.target.value)}><option value="todo">รอทำ</option><option value="in_progress">กำลังทำ</option><option value="review">ตรวจสอบ</option><option value="done">เสร็จแล้ว</option></Select></article>)}</section>)}</div></>;
}

"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { createNote, createProject, createTask, updateNote, updateTask } from "@/app/actions/data";
import type { Activity, Note, Project, Task } from "@/lib/database.types";

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
  return <section className="empty-workspace"><span>START HERE</span><h1>สร้างโปรเจกต์แรกของคุณ</h1><p>ข้อมูลใน workspace จะแยกตามบัญชีและบันทึกลง Supabase</p><form onSubmit={submit}><label>ชื่อโปรเจกต์<input value={name} onChange={event => setName(event.target.value)} required maxLength={200} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary" disabled={pending}>{pending ? "กำลังสร้าง…" : "Create project"}</button></form></section>;
}

export function ConnectedDashboard({ project, tasks, activities }: { project: Project; tasks: Task[]; activities: Activity[] }) {
  const completed = tasks.filter(task => task.status === "done").length;
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  return <><section className="project-hero"><div><span className="status"><i /> {project.status.toUpperCase()}</span><h1>{project.name}</h1><p>ภาพรวมงานและกิจกรรมล่าสุดจาก workspace ของคุณ</p></div><div className="hero-actions"><Link href="/notes">Open notes</Link><Link className="primary link-button" href="/checklists">Add task</Link></div></section><nav className="project-tabs"><Link className="active" href="/dashboard">Overview</Link><Link href="/notes">Notes</Link><Link href="/checklists">Tasks</Link><Link href="/activity">Activity</Link></nav><div className="cockpit-grid"><section className="cockpit-main"><div className="section-head"><div><span>WORK</span><h2>Current tasks</h2></div><Link href="/checklists">View all</Link></div><div className="focus-list">{tasks.length ? tasks.slice(0, 5).map((task, index) => <article key={task.id}><span className={task.status === "done" ? "task-index done" : "task-index"}>{task.status === "done" ? "✓" : String(index + 1).padStart(2, "0")}</span><div><b>{task.title}</b><small>{task.status} · {task.priority}</small></div></article>) : <p className="empty-copy">ยังไม่มี task ในโปรเจกต์นี้</p>}</div><div className="section-head activity-head"><div><span>RECENT</span><h2>Project activity</h2></div><Link href="/activity">Full history</Link></div><div className="compact-activity">{activities.slice(0, 3).map(item => <article key={item.id}><i>{item.entity_type.slice(0, 2).toUpperCase()}</i><div><b>{item.action} {item.entity_type}</b><small>{new Date(item.created_at).toLocaleString("th-TH")}</small></div></article>)}{!activities.length && <p className="empty-copy">ยังไม่มีกิจกรรม</p>}</div></section><aside className="cockpit-side"><section className="project-health"><div className="section-head"><div><span>PROGRESS</span><h2>{completed} of {tasks.length} done</h2></div><strong>{progress}%</strong></div><div className="progress"><i style={{ width: `${progress}%` }} /></div><dl><div><dt>All tasks</dt><dd>{tasks.length}</dd></div><div><dt>Active</dt><dd>{tasks.length - completed}</dd></div><div><dt>Done</dt><dd>{completed}</dd></div></dl></section></aside></div></>;
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

export function ConnectedTasks({ project, initial }: { project: Project; initial: Task[] }) {
  const [tasks, setTasks] = useState(initial);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("ทั่วไป");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
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
  return <><div className="heading"><div><small>TASKS</small><h1>{project.name}</h1><p>จัดลำดับความเร่งและติดตามงานทั้งหมด</p></div><Link className="view-board" href="/board">ดูแบบ Board</Link></div><section className="panel feature-panel"><div className="checklist">{tasks.map(task => <div className="task" key={task.id}><input aria-label={`ทำเครื่องหมาย ${task.title}`} type="checkbox" checked={task.status === "done"} onChange={() => toggle(task)} /><span className={task.status === "done" ? "strike" : ""}>{task.title}</span><em className={`priority ${priorityClass(task.priority)}`}>{priorityLabel(task.priority)}</em></div>)}{!tasks.length && <p className="empty-copy">ยังไม่มี task</p>}{error && <p className="form-error" role="alert">{error}</p>}<form className="task-form" onSubmit={add}><input aria-label="ชื่อ task" value={title} onChange={event => setTitle(event.target.value)} placeholder="เพิ่ม task…" required /><select aria-label="ความเร่ง" value={priority} onChange={event => setPriority(event.target.value)}><option>ทั่วไป</option><option>สำคัญ</option><option>สำคัญมาก</option></select><button disabled={pending}>{pending ? "กำลังบันทึก…" : "เพิ่มงาน"}</button></form></div></section></>;
}

function noteText(content: Note["content"]) { return typeof content === "string" ? content : JSON.stringify(content, null, 2); }

export function ConnectedNotes({ project, initial }: { project: Project; initial: Note[] }) {
  const [notes, setNotes] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? "");
  const selected = notes.find(note => note.id === selectedId);
  const [pending, startTransition] = useTransition();
  const create = () => startTransition(async () => {
    const note = await createNote({ project_id: project.id, title: "Untitled note", content: "" });
    setNotes(current => [note, ...current]);
    setSelectedId(note.id);
  });
  const patch = (input: { title?: string; content?: string }) => {
    if (!selected) return;
    setNotes(current => current.map(note => note.id === selected.id ? { ...note, ...input } : note));
  };
  const save = () => selected && startTransition(async () => {
    const updated = await updateNote(selected.id, { title: selected.title, content: noteText(selected.content) });
    setNotes(current => current.map(note => note.id === updated.id ? updated : note));
  });
  return <><div className="heading"><div><small>NOTES</small><h1>{project.name}</h1><p>Notes จาก Supabase สำหรับบัญชีนี้</p></div><button onClick={create} disabled={pending}>+ New note</button></div><div className="notes-grid connected-notes"><aside className="panel note-list">{notes.map(note => <button className={note.id === selectedId ? "active" : ""} key={note.id} onClick={() => setSelectedId(note.id)}><b>{note.title}</b><small>{new Date(note.created_at).toLocaleDateString("th-TH")}</small></button>)}{!notes.length && <p className="empty-copy">ยังไม่มี note</p>}</aside><section className="panel feature-panel editor">{selected ? <><div className="note-title-row"><input aria-label="ชื่อ note" value={selected.title} onChange={event => patch({ title: event.target.value })} /><button onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</button></div><textarea aria-label="เนื้อหา note" className="note-editor" value={noteText(selected.content)} onChange={event => patch({ content: event.target.value })} /></> : <div className="empty-editor">สร้าง note เพื่อเริ่มเขียน</div>}</section></div></>;
}

export function ConnectedActivity({ project, activities }: { project: Project; activities: Activity[] }) {
  return <><div className="heading"><div><small>ACTIVITY</small><h1>{project.name}</h1><p>ประวัติการเปลี่ยนแปลงจาก Supabase</p></div></div><section className="panel feature-panel"><div className="timeline">{activities.map(item => <div key={item.id}><span /><section><b>{item.action} {item.entity_type}</b><small>{new Date(item.created_at).toLocaleString("th-TH")}</small></section></div>)}{!activities.length && <p className="empty-copy">ยังไม่มีกิจกรรม</p>}</div></section></>;
}

export function ConnectedBoard({ project, initial }: { project: Project; initial: Task[] }) {
  const statuses = ["todo", "in_progress", "review", "done"] as const;
  const labels = { todo: "รอทำ", in_progress: "กำลังทำ", review: "ตรวจสอบ", done: "เสร็จแล้ว" };
  const [tasks, setTasks] = useState(initial);
  const [dragging, setDragging] = useState("");
  const [over, setOver] = useState("");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
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
  return <><div className="heading"><div><small>BOARD</small><h1>{project.name}</h1><p>ลากการ์ดเพื่อเปลี่ยนสถานะ งานจะถูกบันทึกอัตโนมัติ</p></div><Link className="view-board" href="/checklists">ดูแบบรายการ</Link></div>{error && <p className="form-error board-error" role="alert">{error}</p>}<div className="kanban">{statuses.map(status => <section className={over === status ? "drop-active" : ""} key={status} onDragOver={event => { event.preventDefault(); setOver(status); }} onDragLeave={() => setOver("")} onDrop={event => { event.preventDefault(); move(event.dataTransfer.getData("text/plain"), status); setDragging(""); setOver(""); }}><div className="column-title"><h2>{labels[status]}</h2><span>{tasks.filter(task => task.status === status).length}</span></div>{tasks.filter(task => task.status === status).map(task => <article className={dragging === task.id ? "dragging" : ""} draggable key={task.id} onDragStart={event => { event.dataTransfer.setData("text/plain", task.id); setDragging(task.id); }} onDragEnd={() => { setDragging(""); setOver(""); }}><small className={`priority ${priorityClass(task.priority)}`}>{priorityLabel(task.priority)}</small><b>{task.title}</b><span>{task.description || "ไม่มีรายละเอียด"}</span><select aria-label={`ย้าย ${task.title}`} value={task.status} onChange={event => move(task.id, event.target.value)}><option value="todo">รอทำ</option><option value="in_progress">กำลังทำ</option><option value="review">ตรวจสอบ</option><option value="done">เสร็จแล้ว</option></select></article>)}</section>)}</div></>;
}

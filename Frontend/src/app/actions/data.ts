"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/lib/database.types";
import { authorizeProjectAccess } from "@/lib/projects/authorization";
import { canEditProject } from "@/lib/projects/permissions";
import { logInternalError, safeError } from "@/lib/errors";
import { BUILTIN_TEMPLATES } from "@/lib/templates";

type Note = Tables<"notes">;
type Task = Tables<"tasks">;

function databaseError(message: string): Error { return safeError("DATABASE_UNAVAILABLE", message); }

const uuid = z.uuid();
const projectInput = z.object({ name: z.string().trim().min(1).max(200), status: z.string().trim().min(1).max(50) });
const taskInput = z.object({
  project_id: uuid,
  title: z.string().trim().min(1).max(500),
  description: z.string().max(10000).optional().nullable(),
  status: z.string().min(1).max(50),
  priority: z.string().min(1).max(50),
  due_date: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  branch_name: z.string().max(255).optional().nullable(),
  linked_commit_sha: z.string().max(40).optional().nullable(),
  linked_pull_request_number: z.number().int().optional().nullable(),
  assignee_id: z.string().optional().nullable(),
});
const json = z.json();
const noteInput = z.object({ project_id: uuid, title: z.string().trim().min(1).max(500), content: json });
const versionInput = z.object({ project_id: uuid, entity_type: z.enum(["task", "note"]), entity_id: uuid, old_data: json, new_data: json, change_summary: z.string().trim().min(1).max(1000) });

async function context() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return { supabase, user };
}
async function ownProject(projectId: string, actionContext?: Awaited<ReturnType<typeof context>>) {
  const { supabase, user } = actionContext ?? await context();
  const { data, error } = await supabase.from("projects").select("id").eq("id", uuid.parse(projectId)).eq("user_id", user.id).single();
  if (error || !data) throw new Error("Project not found");
  return { supabase, user };
}
async function accessibleProject(projectId: string, actionContext?: Awaited<ReturnType<typeof context>>) {
  const { supabase, user } = actionContext ?? await context();
  const access = await authorizeProjectAccess(supabase, user.id, uuid.parse(projectId));
  return { supabase, user, access };
}
async function editableProject(projectId: string, actionContext?: Awaited<ReturnType<typeof context>>) {
  const result = await accessibleProject(projectId, actionContext);
  if (!canEditProject(result.access.role)) throw new Error("คุณมีสิทธิ์อ่านอย่างเดียวในโปรเจกต์นี้");
  return result;
}
type ActionContext = Awaited<ReturnType<typeof context>>;

async function insertActivity({ supabase, user }: ActionContext, projectId: string, action: string, entityType: string, entityId: string, metadata: Json) {
  const { error } = await supabase.from("activities").insert({ id: crypto.randomUUID(), user_id: user.id, project_id: projectId, action, entity_type: entityType, entity_id: entityId, metadata });
  if (error) throw databaseError("ไม่สามารถบันทึกกิจกรรมได้");
}

async function activity(projectId: string, action: string, entityType: string, entityId: string, metadata: Json) {
  const actionContext = await editableProject(projectId);
  await insertActivity(actionContext, projectId, action, entityType, entityId, metadata);
}

async function insertVersion({ supabase, user }: ActionContext, value: z.infer<typeof versionInput>) {
  const { data, error } = await supabase.from("versions").insert({ id: crypto.randomUUID(), user_id: user.id, ...value }).select().single();
  if (error) throw databaseError("ไม่สามารถบันทึกประวัติการเปลี่ยนแปลงได้");
  return data;
}

export async function createProject(input: unknown) {
  const value = projectInput.parse(input), { supabase, user } = await context();
  const { data, error } = await supabase.from("projects").insert({ id: crypto.randomUUID(), ...value, user_id: user.id }).select().single();
  if (error) throw databaseError("สร้างโปรเจกต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  await activity(data.id, "created", "project", data.id, { name: data.name });
  return data;
}
export async function getProjects() { const { supabase, user } = await context(); const [owned, memberships] = await Promise.all([supabase.from("projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false }), supabase.from("project_members").select("project_id").eq("user_id", user.id)]); if (owned.error) throw databaseError("โหลดโปรเจกต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"); if (memberships.error) throw databaseError("โหลดสมาชิกโปรเจกต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"); const ids = [...new Set((memberships.data ?? []).map(item => item.project_id))]; const shared = ids.length ? await supabase.from("projects").select("*").in("id", ids) : { data: [], error: null }; if (shared.error) throw databaseError("โหลดโปรเจกต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"); return [...(owned.data ?? []), ...(shared.data ?? [])].filter((project, index, items) => items.findIndex(item => item.id === project.id) === index).sort((left, right) => new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime()); }
 export async function updateProject(id: string, input: unknown) { const value = projectInput.partial().refine(v => Object.keys(v).length > 0).parse(input), { supabase, user } = await context(); const { data, error } = await supabase.from("projects").update(value).eq("id", uuid.parse(id)).eq("user_id", user.id).select().single(); if (error) throw databaseError("แก้ไขโปรเจกต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"); await activity(data.id, "updated", "project", data.id, value); return data; }
export async function deleteProject(id: string) { const projectId = uuid.parse(id), { supabase, user } = await ownProject(projectId); await activity(projectId, "deleted", "project", projectId, {}); const { error } = await supabase.from("projects").delete().eq("id", projectId).eq("user_id", user.id); if (error) throw databaseError("ลบโปรเจกต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"); }

export async function createTask(input: unknown) { const value = taskInput.parse(input), actionContext = await editableProject(value.project_id), { supabase } = actionContext; const { data, error } = await supabase.from("tasks").insert({ id: crypto.randomUUID(), ...value }).select().single(); if (error) throw databaseError("สร้างงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"); try { await insertActivity(actionContext, data.project_id, "created", "task", data.id, { title: data.title }); } catch (activityError) { logInternalError("create_task_activity", activityError); } return data; }
export async function getTasks(projectId: string) { const id = uuid.parse(projectId), { supabase } = await accessibleProject(id); const { data, error } = await supabase.from("tasks").select("*").eq("project_id", id).order("created_at", { ascending: false }); if (error) throw databaseError("โหลดงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"); return data; }
export async function updateTask(id: string, input: unknown, changeSummary = "Task updated") { const taskId = uuid.parse(id), value = taskInput.omit({ project_id: true }).partial().refine(v => Object.keys(v).length > 0).parse(input); const actionContext = await context(), { supabase } = actionContext; const { data: old, error: readError } = await supabase.from("tasks").select("*").eq("id", taskId).single(); if (readError || !old) throw new Error("Task not found"); const ownedContext = await editableProject(old.project_id, actionContext); const { data, error } = await supabase.from("tasks").update(value).eq("id", taskId).eq("project_id", old.project_id).select().single(); if (error) throw databaseError("แก้ไขงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"); await Promise.all([insertVersion(ownedContext, versionInput.parse({ project_id: old.project_id, entity_type: "task", entity_id: taskId, old_data: old, new_data: data, change_summary: changeSummary })), insertActivity(ownedContext, old.project_id, data.status === "done" && old.status !== "done" ? "completed" : "updated", "task", taskId, value)]); return data; }
export async function deleteTask(id: string) { const taskId = uuid.parse(id), actionContext = await context(), { supabase } = actionContext; const { data, error } = await supabase.from("tasks").select("*").eq("id", taskId).single(); if (error || !data) throw new Error("Task not found"); await editableProject(data.project_id, actionContext); await activity(data.project_id, "deleted", "task", taskId, { title: data.title }); const result = await supabase.from("tasks").delete().eq("id", taskId).eq("project_id", data.project_id); if (result.error) throw databaseError("ลบงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"); }

export async function createNote(input: unknown) { const value = noteInput.parse(input), actionContext = await editableProject(value.project_id), { supabase } = actionContext; const { data, error } = await supabase.from("notes").insert({ id: crypto.randomUUID(), ...value }).select().single(); if (error) throw databaseError("สร้างโน้ตไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"); try { await insertActivity(actionContext, data.project_id, "created", "note", data.id, { title: data.title }); } catch (activityError) { logInternalError("create_note_activity", activityError); } return data; }
export async function getNotes(projectId: string) { const id = uuid.parse(projectId), { supabase } = await accessibleProject(id); const { data, error } = await supabase.from("notes").select("*").eq("project_id", id).order("created_at", { ascending: false }); if (error) throw databaseError("โหลดโน้ตไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"); return data; }
export async function updateNote(id: string, input: unknown, changeSummary = "Note updated") { const noteId = uuid.parse(id), value = noteInput.omit({ project_id: true }).partial().refine(v => Object.keys(v).length > 0).parse(input); const actionContext = await context(), { supabase } = actionContext; const { data: old, error: readError } = await supabase.from("notes").select("*").eq("id", noteId).single(); if (readError || !old) throw new Error("Note not found"); const ownedContext = await editableProject(old.project_id, actionContext); const { data, error } = await supabase.from("notes").update(value).eq("id", noteId).eq("project_id", old.project_id).select().single(); if (error) throw databaseError("บันทึกโน้ตไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"); await Promise.allSettled([insertVersion(ownedContext, versionInput.parse({ project_id: old.project_id, entity_type: "note", entity_id: noteId, old_data: old, new_data: data, change_summary: changeSummary })), insertActivity(ownedContext, old.project_id, "updated", "note", noteId, value)]); return data; }

export async function getActivityTimeline(projectId: string) { const id = uuid.parse(projectId), { supabase } = await accessibleProject(id); const { data, error } = await supabase.from("activities").select("*").eq("project_id", id).order("created_at", { ascending: false }); if (error) throw databaseError("โหลดกิจกรรมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"); return data; }
export async function createVersion(input: unknown) { const value = versionInput.parse(input), actionContext = await editableProject(value.project_id); return insertVersion(actionContext, value); }
export async function getVersions(projectId: string, entityType?: "task" | "note", entityId?: string) { const id = uuid.parse(projectId), { supabase } = await accessibleProject(id); let query = supabase.from("versions").select("*").eq("project_id", id); if (entityType) query = query.eq("entity_type", entityType); if (entityId) query = query.eq("entity_id", uuid.parse(entityId)); const { data, error } = await query.order("created_at", { ascending: false }); if (error) throw databaseError("โหลดประวัติไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"); return data; }
export async function restoreVersion(id: string) { const versionId = uuid.parse(id), { supabase } = await context(); const { data: version, error } = await supabase.from("versions").select("*").eq("id", versionId).single(); if (error || !version || !version.project_id || !version.entity_id) throw new Error("Version not found"); await accessibleProject(version.project_id); if (version.entity_type === "task") return updateTask(version.entity_id, version.old_data as Partial<Task>, `Restored version ${version.id}`); return updateNote(version.entity_id, version.old_data as Partial<Note>, `Restored version ${version.id}`); }

export type SearchResultItem = {
  id: string;
  title: string;
  type: "task" | "note" | "flowchart" | "activity";
  typeLabel: string;
  href: string;
  subtitle?: string;
  date?: string | null;
};

export async function searchWorkspace(projectId: string, query: string): Promise<SearchResultItem[]> {
  const id = uuid.parse(projectId);
  const { supabase } = await accessibleProject(id);
  const q = query.trim();
  if (!q) return [];

  const [tasksRes, notesRes, flowchartsRes, activitiesRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, priority, created_at")
      .eq("project_id", id)
      .ilike("title", `%${q}%`)
      .limit(10),
    supabase
      .from("notes")
      .select("id, title, created_at")
      .eq("project_id", id)
      .ilike("title", `%${q}%`)
      .limit(10),
    supabase
      .from("flowcharts")
      .select("id, name, created_at")
      .eq("project_id", id)
      .ilike("name", `%${q}%`)
      .limit(10),
    supabase
      .from("activities")
      .select("id, action, entity_type, created_at")
      .eq("project_id", id)
      .ilike("action", `%${q}%`)
      .limit(10),
  ]);

  const results: SearchResultItem[] = [];

  for (const t of tasksRes.data ?? []) {
    results.push({
      id: `task-${t.id}`,
      title: t.title || "ไม่มีชื่อ",
      type: "task",
      typeLabel: "งาน (Task)",
      href: "/checklists",
      subtitle: `สถานะ: ${t.status} · ความสำคัญ: ${t.priority}`,
      date: t.created_at,
    });
  }

  for (const n of notesRes.data ?? []) {
    results.push({
      id: `note-${n.id}`,
      title: n.title || "ไม่มีชื่อ",
      type: "note",
      typeLabel: "โน้ต (Note)",
      href: "/notes",
      date: n.created_at,
    });
  }

  for (const f of flowchartsRes.data ?? []) {
    results.push({
      id: `flowchart-${f.id}`,
      title: f.name || "ไม่มีชื่อ",
      type: "flowchart",
      typeLabel: "ผังงาน (Flowchart)",
      href: `/projects/${id}/flowcharts/${f.id}`,
      date: f.created_at,
    });
  }

  for (const a of activitiesRes.data ?? []) {
    results.push({
      id: `activity-${a.id}`,
      title: `${a.action} ${a.entity_type}`,
      type: "activity",
      typeLabel: "กิจกรรม (Activity)",
      href: "/activity",
      date: a.created_at,
    });
  }

  return results.sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
}

export type IdeaItem = {
  id: string;
  text: string;
  created_at: string | null;
};

export async function createIdea(projectId: string, text: string): Promise<IdeaItem> {
  const pId = uuid.parse(projectId);
  const trimmed = text.trim();
  if (!trimmed) throw new Error("ข้อความไอเดียต้องไม่ว่างเปล่า");
  const actionContext = await editableProject(pId);
  const { supabase, user } = actionContext;
  const id = crypto.randomUUID();
  const { data, error } = await supabase.from("activities").insert({
    id,
    user_id: user.id,
    project_id: pId,
    action: "captured",
    entity_type: "idea",
    entity_id: id,
    metadata: { text: trimmed },
  }).select().single();

  if (error || !data) throw databaseError("บันทึกไอเดียไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");

  return {
    id: data.id,
    text: trimmed,
    created_at: data.created_at,
  };
}

export async function getIdeas(projectId: string): Promise<IdeaItem[]> {
  const pId = uuid.parse(projectId);
  const { supabase } = await accessibleProject(pId);
  const { data, error } = await supabase
    .from("activities")
    .select("id, metadata, created_at")
    .eq("project_id", pId)
    .eq("entity_type", "idea")
    .order("created_at", { ascending: false });

  if (error) throw databaseError("โหลดไอเดียไม่สำเร็จ");

  return (data ?? []).map((item) => {
    const meta = item.metadata as { text?: string } | null;
    return {
      id: item.id,
      text: meta?.text ?? "",
      created_at: item.created_at,
    };
  }).filter((item) => Boolean(item.text));
}

export async function deleteIdea(id: string): Promise<void> {
  const ideaId = uuid.parse(id);
  const actionContext = await context();
  const { supabase } = actionContext;
  const { data: old, error: readError } = await supabase.from("activities").select("project_id").eq("id", ideaId).single();
  if (readError || !old || !old.project_id) throw new Error("ไม่พบไอเดีย");
  await editableProject(old.project_id, actionContext);
  const { error } = await supabase.from("activities").delete().eq("id", ideaId);
  if (error) throw databaseError("ลบไอเดียไม่สำเร็จ");
}

export async function convertIdeaToTask(ideaId: string, projectId: string, text: string) {
  const pId = uuid.parse(projectId);
  const task = await createTask({
    project_id: pId,
    title: text.slice(0, 500),
    description: text,
    status: "todo",
    priority: "ทั่วไป",
  });
  await deleteIdea(ideaId);
  return task;
}

export async function convertIdeaToNote(ideaId: string, projectId: string, text: string) {
  const pId = uuid.parse(projectId);
  const firstLine = text.split("\n")[0].trim().slice(0, 200) || "โน้ตจากไอเดีย";
  const note = await createNote({
    project_id: pId,
    title: firstLine,
    content: text,
  });
  await deleteIdea(ideaId);
  return note;
}

export async function applyTemplate(projectId: string, templateId: string) {
  const pId = uuid.parse(projectId);
  const template = BUILTIN_TEMPLATES.find((t) => t.id === templateId);
  if (!template) throw new Error("ไม่พบเทมเพลตที่ระบุ");

  await editableProject(pId);

  // 1. สร้าง Note จากเทมเพลต
  const note = await createNote({
    project_id: pId,
    title: template.title,
    content: template.noteContent,
  });

  // 2. สร้าง Tasks จากเทมเพลต
  const createdTasks = [];
  for (const t of template.tasks) {
    const task = await createTask({
      project_id: pId,
      title: t.title,
      description: t.description || `งานที่สร้างจากแม่แบบ: ${template.title}`,
      status: "todo",
      priority: t.priority,
    });
    createdTasks.push(task);
  }

  return {
    note,
    tasksCount: createdTasks.length,
  };
}

export type ContextMapData = {
  project: { id: string; name: string };
  repositories: Array<{ id: string; name: string; owner: string; url: string }>;
  notes: Array<{ id: string; title: string }>;
  tasks: Array<{ id: string; title: string; status: string; priority: string }>;
  flowcharts: Array<{ id: string; name: string }>;
  membersCount: number;
};

export async function getProjectContextMap(projectId: string): Promise<ContextMapData> {
  const pId = uuid.parse(projectId);
  const { supabase, access } = await accessibleProject(pId);

  const [projectRes, reposRes, notesRes, tasksRes, flowchartsRes, membersRes] = await Promise.all([
    supabase.from("projects").select("id, name").eq("id", pId).maybeSingle(),
    supabase.from("project_repositories").select("id, github_name, github_owner, github_url").eq("project_id", pId),
    supabase.from("notes").select("id, title").eq("project_id", pId).limit(8),
    supabase.from("tasks").select("id, title, status, priority").eq("project_id", pId).limit(12),
    supabase.from("flowcharts").select("id, name").eq("project_id", pId).limit(6),
    supabase.from("project_members").select("id", { count: "exact" }).eq("project_id", pId),
  ]);

  return {
    project: {
      id: access.project.id,
      name: projectRes.data?.name || "โปรเจกต์",
    },
    repositories: (reposRes.data ?? []).map(r => ({ id: r.id, name: r.github_name, owner: r.github_owner, url: r.github_url })),
    notes: (notesRes.data ?? []).map(n => ({ id: n.id, title: n.title || "โน้ตไม่มีชื่อ" })),
    tasks: (tasksRes.data ?? []).map(t => ({ id: t.id, title: t.title || "งานไม่มีชื่อ", status: t.status, priority: t.priority })),
    flowcharts: (flowchartsRes.data ?? []).map(f => ({ id: f.id, name: f.name || "ผังงานไม่มีชื่อ" })),
    membersCount: membersRes.count ?? 1,
  };
}

export type AiGeneratedTask = {
  title: string;
  description: string;
  priority: string;
};

export async function aiAnalyzeRequirement(requirementText: string): Promise<{ summary: string; tasks: AiGeneratedTask[] }> {
  const text = requirementText.trim();
  if (!text) throw new Error("กรุณากรอกข้อความ Requirement");

  // Rule-based Developer Intelligence Breakdown
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const tasks: AiGeneratedTask[] = [];

  // Generate actionable tasks from requirement
  tasks.push({
    title: `ออกแบบ Architecture และ Data Flow สำหรับ: ${lines[0].slice(0, 80)}`,
    description: `วิเคราะห์โครงสร้างข้อมูลและ Flow การทำงานตามข้อกำหนด:\n${text}`,
    priority: "สำคัญมาก",
  });

  tasks.push({
    title: `สร้าง Database Schema และ API Endpoint`,
    description: `พัฒนาตารางฐานข้อมูลและ Route Handler เพื่อรองรับฟีเจอร์นี้`,
    priority: "สำคัญ",
  });

  tasks.push({
    title: `พัฒนา UI Components และจัดการ State การทำงาน`,
    description: `สร้างหน้าจอและส่วนติดต่อผู้ใช้ให้สอดคล้องกับ Requirement`,
    priority: "สำคัญ",
  });

  tasks.push({
    title: `เขียน Automated Tests และทดสอบความปลอดภัย (Security Check)`,
    description: `ตรวจทานสิทธิ์การเข้าถึง, Validation และ Test coverage`,
    priority: "ทั่วไป",
  });

  const summary = `วิเคราะห์ความต้องการเรียบร้อย: พบประเด็นหลัก "${lines[0]}" แนะนำให้แบ่งการพัฒนาออกเป็น ${tasks.length} ขั้นตอนตามลำดับ`;

  return { summary, tasks };
}

export async function aiCreateTasksFromRequirement(projectId: string, tasks: AiGeneratedTask[]) {
  const pId = uuid.parse(projectId);
  await editableProject(pId);

  const created = [];
  for (const t of tasks) {
    const task = await createTask({
      project_id: pId,
      title: t.title,
      description: t.description,
      status: "todo",
      priority: t.priority,
    });
    created.push(task);
  }

  return created;
}






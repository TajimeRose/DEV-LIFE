"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json, Note, Task } from "@/lib/database.types";

const uuid = z.uuid();
const projectInput = z.object({ name: z.string().trim().min(1).max(200), status: z.string().trim().min(1).max(50) });
const taskInput = z.object({ project_id: uuid, title: z.string().trim().min(1).max(500), description: z.string().max(10000), status: z.string().min(1).max(50), priority: z.string().min(1).max(50) });
const json = z.json();
const noteInput = z.object({ project_id: uuid, title: z.string().trim().min(1).max(500), content: json });
const versionInput = z.object({ project_id: uuid, entity_type: z.enum(["task", "note"]), entity_id: uuid, old_data: json, new_data: json, change_summary: z.string().trim().min(1).max(1000) });

async function context() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return { supabase, user };
}
async function ownProject(projectId: string) {
  const { supabase, user } = await context();
  const { data, error } = await supabase.from("projects").select("id").eq("id", uuid.parse(projectId)).eq("user_id", user.id).single();
  if (error || !data) throw new Error("Project not found");
  return { supabase, user };
}
async function activity(projectId: string, action: string, entityType: string, entityId: string, metadata: Json) {
  const { supabase, user } = await ownProject(projectId);
  const { error } = await supabase.from("activities").insert({ id: crypto.randomUUID(), user_id: user.id, project_id: projectId, action, entity_type: entityType, entity_id: entityId, metadata });
  if (error) throw new Error(error.message);
}

export async function createProject(input: unknown) {
  const value = projectInput.parse(input), { supabase, user } = await context();
  const { data, error } = await supabase.from("projects").insert({ ...value, user_id: user.id }).select().single();
  if (error) throw new Error(error.message);
  await activity(data.id, "created", "project", data.id, { name: data.name });
  return data;
}
export async function getProjects() { const { supabase, user } = await context(); const { data, error } = await supabase.from("projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false }); if (error) throw new Error(error.message); return data; }
export async function updateProject(id: string, input: unknown) { const value = projectInput.partial().refine(v => Object.keys(v).length > 0).parse(input), { supabase, user } = await context(); const { data, error } = await supabase.from("projects").update(value).eq("id", uuid.parse(id)).eq("user_id", user.id).select().single(); if (error) throw new Error(error.message); await activity(data.id, "updated", "project", data.id, value); return data; }
export async function deleteProject(id: string) { const projectId = uuid.parse(id), { supabase, user } = await ownProject(projectId); await activity(projectId, "deleted", "project", projectId, {}); const { error } = await supabase.from("projects").delete().eq("id", projectId).eq("user_id", user.id); if (error) throw new Error(error.message); }

export async function createTask(input: unknown) { const value = taskInput.parse(input), { supabase } = await ownProject(value.project_id); const { data, error } = await supabase.from("tasks").insert({ id: crypto.randomUUID(), ...value }).select().single(); if (error) throw new Error(error.message); await activity(data.project_id, "created", "task", data.id, { title: data.title }); return data; }
export async function getTasks(projectId: string) { const id = uuid.parse(projectId), { supabase } = await ownProject(id); const { data, error } = await supabase.from("tasks").select("*").eq("project_id", id).order("created_at", { ascending: false }); if (error) throw new Error(error.message); return data; }
export async function updateTask(id: string, input: unknown, changeSummary = "Task updated") { const taskId = uuid.parse(id), value = taskInput.omit({ project_id: true }).partial().refine(v => Object.keys(v).length > 0).parse(input); const { supabase } = await context(); const { data: old, error: readError } = await supabase.from("tasks").select("*").eq("id", taskId).single(); if (readError || !old) throw new Error("Task not found"); await ownProject(old.project_id); const { data, error } = await supabase.from("tasks").update(value).eq("id", taskId).eq("project_id", old.project_id).select().single(); if (error) throw new Error(error.message); await createVersion({ project_id: old.project_id, entity_type: "task", entity_id: taskId, old_data: old, new_data: data, change_summary: changeSummary }); await activity(old.project_id, data.status === "done" && old.status !== "done" ? "completed" : "updated", "task", taskId, value); return data; }
export async function deleteTask(id: string) { const taskId = uuid.parse(id), { supabase } = await context(); const { data, error } = await supabase.from("tasks").select("*").eq("id", taskId).single(); if (error || !data) throw new Error("Task not found"); await ownProject(data.project_id); await activity(data.project_id, "deleted", "task", taskId, { title: data.title }); const result = await supabase.from("tasks").delete().eq("id", taskId).eq("project_id", data.project_id); if (result.error) throw new Error(result.error.message); }

export async function createNote(input: unknown) { const value = noteInput.parse(input), { supabase } = await ownProject(value.project_id); const { data, error } = await supabase.from("notes").insert({ id: crypto.randomUUID(), ...value }).select().single(); if (error) throw new Error(error.message); await activity(data.project_id, "created", "note", data.id, { title: data.title }); return data; }
export async function getNotes(projectId: string) { const id = uuid.parse(projectId), { supabase } = await ownProject(id); const { data, error } = await supabase.from("notes").select("*").eq("project_id", id).order("created_at", { ascending: false }); if (error) throw new Error(error.message); return data; }
export async function updateNote(id: string, input: unknown, changeSummary = "Note updated") { const noteId = uuid.parse(id), value = noteInput.omit({ project_id: true }).partial().refine(v => Object.keys(v).length > 0).parse(input); const { supabase } = await context(); const { data: old, error: readError } = await supabase.from("notes").select("*").eq("id", noteId).single(); if (readError || !old) throw new Error("Note not found"); await ownProject(old.project_id); const { data, error } = await supabase.from("notes").update(value).eq("id", noteId).eq("project_id", old.project_id).select().single(); if (error) throw new Error(error.message); await createVersion({ project_id: old.project_id, entity_type: "note", entity_id: noteId, old_data: old, new_data: data, change_summary: changeSummary }); await activity(old.project_id, "updated", "note", noteId, value); return data; }

export async function getActivityTimeline(projectId: string) { const id = uuid.parse(projectId), { supabase } = await ownProject(id); const { data, error } = await supabase.from("activities").select("*").eq("project_id", id).order("created_at", { ascending: false }); if (error) throw new Error(error.message); return data; }
export async function createVersion(input: unknown) { const value = versionInput.parse(input), { supabase, user } = await ownProject(value.project_id); const { data, error } = await supabase.from("versions").insert({ id: crypto.randomUUID(), user_id: user.id, ...value }).select().single(); if (error) throw new Error(error.message); return data; }
export async function getVersions(projectId: string, entityType?: "task" | "note", entityId?: string) { const id = uuid.parse(projectId), { supabase } = await ownProject(id); let query = supabase.from("versions").select("*").eq("project_id", id); if (entityType) query = query.eq("entity_type", entityType); if (entityId) query = query.eq("entity_id", uuid.parse(entityId)); const { data, error } = await query.order("created_at", { ascending: false }); if (error) throw new Error(error.message); return data; }
export async function restoreVersion(id: string) { const versionId = uuid.parse(id), { supabase } = await context(); const { data: version, error } = await supabase.from("versions").select("*").eq("id", versionId).single(); if (error || !version) throw new Error("Version not found"); await ownProject(version.project_id); if (version.entity_type === "task") return updateTask(version.entity_id, version.old_data as Partial<Task>, `Restored version ${version.id}`); return updateNote(version.entity_id, version.old_data as Partial<Note>, `Restored version ${version.id}`); }

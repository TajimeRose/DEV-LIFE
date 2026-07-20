"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { defaultViewport } from "@/lib/flowchart/default-flowchart";
import { toFlowchartRecord } from "@/lib/flowchart/flowchart-types";
import { authorizeProjectAccess } from "@/lib/projects/authorization";
import { canEditProject } from "@/lib/projects/permissions";

const uuid = z.uuid();
const nameSchema = z.string().trim().min(1).max(200);
const descriptionSchema = z.string().trim().max(2000);
export type FlowchartFormState = { error?: string } | null;

async function context(projectId: string) {
  const id = uuid.parse(projectId);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const access = await authorizeProjectAccess(supabase, user.id, id);
  if (!canEditProject(access.role)) throw new Error("คุณมีสิทธิ์อ่านอย่างเดียวในโปรเจกต์นี้");
  return { supabase, user, projectId: id };
}

async function logActivity(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, projectId: string, action: string, flowchartId: string, name: string) {
  await supabase.from("activities").insert({ id: crypto.randomUUID(), user_id: userId, project_id: projectId, action, entity_type: "flowchart", entity_id: flowchartId, metadata: { name } });
}

export async function createFlowchart(_state: FlowchartFormState, formData: FormData): Promise<FlowchartFormState> {
  const projectResult = uuid.safeParse(formData.get("project_id"));
  const nameResult = nameSchema.safeParse(formData.get("name"));
  const descriptionResult = descriptionSchema.safeParse(formData.get("description") ?? "");
  if (!projectResult.success || !nameResult.success || !descriptionResult.success) return { error: "กรุณาตรวจสอบชื่อและรายละเอียด Flowchart" };
  const { supabase, user, projectId } = await context(projectResult.data);
  const newFlowchart = { id: crypto.randomUUID(), user_id: user.id, project_id: projectId, name: nameResult.data, description: descriptionResult.data || null, nodes: [], edges: [], viewport: defaultViewport };
  const { data, error } = await supabase.from("flowcharts").insert(newFlowchart).select().single();
  if (error) return { error: error.message };
  await logActivity(supabase, user.id, projectId, "created", data.id, data.name);
  redirect(`/projects/${projectId}/flowcharts/${data.id}`);
}

export async function createFlowchartInline(projectInput: string, nameInput: string, descriptionInput: string) {
  const projectId = uuid.parse(projectInput), name = nameSchema.parse(nameInput), description = descriptionSchema.parse(descriptionInput);
  const { supabase, user } = await context(projectId);
  const record = { id: crypto.randomUUID(), user_id: user.id, project_id: projectId, name, description: description || null, nodes: [], edges: [], viewport: defaultViewport };
  const { data, error } = await supabase.from("flowcharts").insert(record).select().single();
  if (error) throw new Error(error.message);
  await logActivity(supabase, user.id, projectId, "created", data.id, data.name);
  revalidatePath(`/projects/${projectId}/flowcharts`);
  return toFlowchartRecord(data);
}

export async function renameFlowchart(projectId: string, flowchartId: string, name: string) {
  const parsedId = uuid.parse(flowchartId), parsedName = nameSchema.parse(name);
  const { supabase, user } = await context(projectId);
  const { data, error } = await supabase.from("flowcharts").update({ name: parsedName, updated_at: new Date().toISOString() }).eq("id", parsedId).eq("project_id", projectId).select().single();
  if (error) throw new Error(error.message);
  await logActivity(supabase, user.id, projectId, "renamed", data.id, data.name);
  revalidatePath(`/projects/${projectId}/flowcharts`);
}

export async function duplicateFlowchart(projectId: string, flowchartId: string) {
  const parsedId = uuid.parse(flowchartId);
  const { supabase, user } = await context(projectId);
  const { data: source, error: readError } = await supabase.from("flowcharts").select("*").eq("id", parsedId).eq("project_id", projectId).single();
  if (readError) throw new Error(readError.message);
  const copy = { id: crypto.randomUUID(), user_id: user.id, project_id: projectId, name: `${source.name} (สำเนา)`, description: source.description, nodes: source.nodes, edges: source.edges, viewport: source.viewport };
  const { data, error } = await supabase.from("flowcharts").insert(copy).select().single();
  if (error) throw new Error(error.message);
  await logActivity(supabase, user.id, projectId, "duplicated", data.id, data.name);
  revalidatePath(`/projects/${projectId}/flowcharts`);
}

export async function deleteFlowchart(projectId: string, flowchartId: string) {
  const parsedId = uuid.parse(flowchartId);
  const { supabase, user } = await context(projectId);
  const { data, error: readError } = await supabase.from("flowcharts").select("name").eq("id", parsedId).eq("project_id", projectId).single();
  if (readError) throw new Error(readError.message);
  const { error } = await supabase.from("flowcharts").delete().eq("id", parsedId).eq("project_id", projectId);
  if (error) throw new Error(error.message);
  await logActivity(supabase, user.id, projectId, "deleted", parsedId, data.name);
  revalidatePath(`/projects/${projectId}/flowcharts`);
}

export async function logFlowchartReset(projectId: string, flowchartId: string, name: string) {
  const { supabase, user } = await context(projectId);
  await logActivity(supabase, user.id, projectId, "reset", uuid.parse(flowchartId), nameSchema.parse(name));
}

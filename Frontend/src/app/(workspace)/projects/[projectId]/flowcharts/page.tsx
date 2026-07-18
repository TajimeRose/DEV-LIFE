import { notFound } from "next/navigation";
import { FlowchartList } from "@/components/flowchart/FlowchartList";
import { PageHeader } from "@/components/ui";
import { getCurrentWorkspace } from "@/lib/current-workspace";
import { toFlowchartRecord } from "@/lib/flowchart/flowchart-types";

export default async function Page({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ create?: string }> }) {
  const [{ projectId }, query, { supabase, user, project }] = await Promise.all([params, searchParams, getCurrentWorkspace()]);
  if (!user || !project || project.id !== projectId) notFound();
  const { data, error } = await supabase.from("flowcharts").select("*").eq("project_id", projectId).eq("user_id", user.id).order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return <><PageHeader eyebrow="แผนผัง" title={project.name} description="ออกแบบกระบวนการด้วยแผนภาพที่แก้ไขและบันทึกอัตโนมัติ" /><FlowchartList projectId={projectId} flowcharts={(data ?? []).map(toFlowchartRecord)} initialCreate={query.create === "1"} /></>;
}

import { notFound } from "next/navigation";
import { FlowchartEditor } from "@/components/flowchart/FlowchartEditor";
import { getCurrentWorkspace } from "@/lib/current-workspace";
import { toFlowchartRecord } from "@/lib/flowchart/flowchart-types";

export default async function Page({ params }: { params: Promise<{ projectId: string; flowchartId: string }> }) {
  const [{ projectId, flowchartId }, { supabase, user, project }] = await Promise.all([params, getCurrentWorkspace()]);
  if (!user || !project || project.id !== projectId) notFound();
  const { data, error } = await supabase.from("flowcharts").select("*").eq("id", flowchartId).eq("project_id", projectId).eq("user_id", user.id).single();
  if (error || !data) notFound();
  return <FlowchartEditor flowchart={toFlowchartRecord(data)} />;
}

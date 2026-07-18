import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/database.types";
import type { FlowEdge, FlowNode, FlowViewport } from "./flowchart-types";

export async function saveFlowchart(input: { id: string; project_id: string; name: string; description: string; nodes: FlowNode[]; edges: FlowEdge[]; viewport: FlowViewport }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
  const { error } = await supabase.from("flowcharts").update({ name: input.name.trim(), description: input.description.trim() || null, nodes: input.nodes as unknown as Json, edges: input.edges as unknown as Json, viewport: input.viewport as unknown as Json, updated_at: new Date().toISOString() }).eq("id", input.id).eq("project_id", input.project_id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

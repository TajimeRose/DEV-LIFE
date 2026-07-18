import type { Edge, Node, Viewport } from "@xyflow/react";
import type { Tables } from "@/lib/database.types";

export type FlowNodeType = "start" | "end" | "process" | "decision" | "inputOutput" | "document" | "database" | "connector";
export type FlowNodeData = { label: string; description?: string; backgroundColor?: string; borderColor?: string; [key: string]: unknown };
export type FlowNode = Node<FlowNodeData, FlowNodeType>;
export type FlowEdge = Edge;
export type FlowViewport = Viewport;
export type FlowchartRecord = {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: FlowViewport;
  created_at: string;
  updated_at: string;
};
export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

export function toFlowchartRecord(row: Tables<"flowcharts">): FlowchartRecord {
  const nodes = Array.isArray(row.nodes) ? row.nodes as unknown as FlowNode[] : [];
  const edges = Array.isArray(row.edges) ? row.edges as unknown as FlowEdge[] : [];
  const viewport = row.viewport && typeof row.viewport === "object" && !Array.isArray(row.viewport)
    ? row.viewport as unknown as FlowViewport
    : { x: 0, y: 0, zoom: 1 };
  return { ...row, nodes, edges, viewport };
}

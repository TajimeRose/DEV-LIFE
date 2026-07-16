import type { Edge, Node, Viewport } from "@xyflow/react";

export type FlowNodeType = "start" | "end" | "process" | "decision" | "inputOutput" | "document" | "database" | "connector";
export type FlowNodeData = { label: string; description?: string; [key: string]: unknown };
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


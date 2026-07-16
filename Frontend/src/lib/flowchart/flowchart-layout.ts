import type { FlowNode } from "./flowchart-types";

export function autoLayout(nodes: FlowNode[]): FlowNode[] {
  return nodes.map((node, index) => ({ ...node, position: { x: 360, y: 60 + index * 170 } }));
}

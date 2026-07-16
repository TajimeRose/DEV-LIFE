"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FlowNode } from "@/lib/flowchart/flowchart-types";

const connectionPoints = [
  { id: "top-left", position: Position.Top, style: { left: "18%" } },
  { id: "top", position: Position.Top, style: { left: "50%" } },
  { id: "top-right", position: Position.Top, style: { left: "82%" } },
  { id: "right-top", position: Position.Right, style: { top: "18%" } },
  { id: "right", position: Position.Right, style: { top: "50%" } },
  { id: "right-bottom", position: Position.Right, style: { top: "82%" } },
  { id: "bottom-right", position: Position.Bottom, style: { left: "82%" } },
  { id: "bottom", position: Position.Bottom, style: { left: "50%" } },
  { id: "bottom-left", position: Position.Bottom, style: { left: "18%" } },
  { id: "left-bottom", position: Position.Left, style: { top: "82%" } },
  { id: "left", position: Position.Left, style: { top: "50%" } },
  { id: "left-top", position: Position.Left, style: { top: "18%" } },
] as const;

export function BaseFlowNode({ data, selected, kind }: NodeProps<FlowNode> & { kind: string }) {
  return <div className={`flow-node flow-node-${kind} ${selected ? "selected" : ""}`} style={{ backgroundColor: data.backgroundColor, borderColor: data.borderColor }}>
    {connectionPoints.map(point => <Handle key={point.id} id={point.id} className="flow-handle" type="source" position={point.position} style={point.style} />)}
    <div className="flow-node-content"><b>{data.label}</b>{data.description && <small>{data.description}</small>}</div>
  </div>;
}

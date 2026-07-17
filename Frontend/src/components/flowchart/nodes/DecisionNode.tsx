"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FlowNode } from "@/lib/flowchart/flowchart-types";

const cornerHandles = [
  { id: "top", position: Position.Top },
  { id: "right", position: Position.Right },
  { id: "bottom", position: Position.Bottom },
  { id: "left", position: Position.Left },
] as const;

export function DecisionNode({ data, selected }: NodeProps<FlowNode>) {
  return <div className={`flow-node flow-node-decision ${selected ? "selected" : ""}`}>
    {cornerHandles.map(handle => <Handle key={handle.id} id={handle.id} className="flow-handle" type="source" position={handle.position} />)}
    <div className={`flow-node-decision-shape ${selected ? "selected" : ""}`} style={{ backgroundColor: data.backgroundColor, borderColor: data.borderColor }}>
      <div className="flow-node-content">
        <b>{data.label}</b>
        {data.description && <small>{data.description}</small>}
      </div>
    </div>
  </div>;
}

"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FlowNode } from "@/lib/flowchart/flowchart-types";

export function BaseFlowNode({ data, selected, kind }: NodeProps<FlowNode> & { kind: string }) {
  const decision = kind === "decision";
  return <div className={`flow-node flow-node-${kind} ${selected ? "selected" : ""}`}>
    {kind !== "start" && <Handle type="target" position={Position.Top} />}
    <div className="flow-node-content"><b>{data.label}</b>{data.description && <small>{data.description}</small>}</div>
    {decision ? <><Handle id="yes" type="source" position={Position.Bottom} style={{ left: "30%" }} /><span className="handle-label handle-yes">Yes</span><Handle id="no" type="source" position={Position.Bottom} style={{ left: "70%" }} /><span className="handle-label handle-no">No</span></> : kind !== "end" && <Handle type="source" position={Position.Bottom} />}
  </div>;
}

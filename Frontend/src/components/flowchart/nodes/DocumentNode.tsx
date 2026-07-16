"use client";
import type { NodeProps } from "@xyflow/react"; import type { FlowNode } from "@/lib/flowchart/flowchart-types"; import { BaseFlowNode } from "./BaseFlowNode";
export function DocumentNode(props: NodeProps<FlowNode>) { return <BaseFlowNode {...props} kind="document" />; }

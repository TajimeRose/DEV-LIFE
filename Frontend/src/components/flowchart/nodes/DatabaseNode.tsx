"use client";
import type { NodeProps } from "@xyflow/react"; import type { FlowNode } from "@/lib/flowchart/flowchart-types"; import { BaseFlowNode } from "./BaseFlowNode";
export function DatabaseNode(props: NodeProps<FlowNode>) { return <BaseFlowNode {...props} kind="database" />; }

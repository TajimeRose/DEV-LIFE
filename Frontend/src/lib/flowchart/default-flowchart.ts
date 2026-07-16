import type { FlowEdge, FlowNode, FlowNodeType, FlowViewport } from "./flowchart-types";

export const defaultLabels: Record<FlowNodeType, string> = { start: "Start", end: "End", process: "Process", decision: "Decision", inputOutput: "Input / Output", document: "Document", database: "Database", connector: "Connector" };
export const nodeDescriptions: Record<FlowNodeType, string> = { start: "จุดเริ่มต้นของกระบวนการ", end: "จุดสิ้นสุดของกระบวนการ", process: "ขั้นตอนการทำงาน", decision: "เงื่อนไขที่แยกเป็น Yes และ No", inputOutput: "ข้อมูลเข้าหรือข้อมูลออก", document: "เอกสารที่ใช้หรือสร้างขึ้น", database: "แหล่งจัดเก็บข้อมูล", connector: "จุดเชื่อมส่วนที่อยู่ห่างกัน" };

export const defaultNodes: FlowNode[] = [
  { id: "start-1", type: "start", position: { x: 400, y: 50 }, data: { label: "Start", description: "จุดเริ่มต้นของกระบวนการ" } },
  { id: "process-1", type: "process", position: { x: 400, y: 200 }, data: { label: "Process", description: "แก้ไขข้อความขั้นตอนการทำงาน" } },
  { id: "decision-1", type: "decision", position: { x: 400, y: 350 }, data: { label: "Decision", description: "แก้ไขข้อความเงื่อนไข" } },
  { id: "process-yes-1", type: "process", position: { x: 200, y: 520 }, data: { label: "Yes Process", description: "ขั้นตอนเมื่อเงื่อนไขเป็นจริง" } },
  { id: "end-yes-1", type: "end", position: { x: 200, y: 700 }, data: { label: "End", description: "จุดสิ้นสุดของกระบวนการ" } },
  { id: "end-no-1", type: "end", position: { x: 600, y: 520 }, data: { label: "End", description: "จุดสิ้นสุดเมื่อเงื่อนไขเป็นเท็จ" } },
];
export const defaultEdges: FlowEdge[] = [
  { id: "edge-start-process", source: "start-1", target: "process-1", sourceHandle: "bottom", targetHandle: "top", type: "smoothstep", animated: false },
  { id: "edge-process-decision", source: "process-1", target: "decision-1", sourceHandle: "bottom", targetHandle: "top", type: "smoothstep", animated: false },
  { id: "edge-decision-yes", source: "decision-1", target: "process-yes-1", sourceHandle: "left", targetHandle: "top", type: "smoothstep", label: "Yes" },
  { id: "edge-process-yes-end", source: "process-yes-1", target: "end-yes-1", sourceHandle: "bottom", targetHandle: "top", type: "smoothstep" },
  { id: "edge-decision-no", source: "decision-1", target: "end-no-1", sourceHandle: "right", targetHandle: "top", type: "smoothstep", label: "No" },
];
export const defaultViewport: FlowViewport = { x: 0, y: 0, zoom: 1 };
export const freshDefaultNodes = () => defaultNodes.map(node => ({ ...node, position: { ...node.position }, data: { ...node.data } }));
export const freshDefaultEdges = () => defaultEdges.map(edge => ({ ...edge }));

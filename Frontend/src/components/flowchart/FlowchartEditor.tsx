"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { addEdge, Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState, type Connection, type NodeTypes } from "@xyflow/react";
import { logFlowchartReset, renameFlowchart } from "@/app/actions/flowcharts";
import { Button, FormField, Input, Modal, Textarea } from "@/components/ui";
import { autoLayout } from "@/lib/flowchart/flowchart-layout";
import { defaultLabels, defaultViewport, freshDefaultEdges, freshDefaultNodes, nodeDescriptions } from "@/lib/flowchart/default-flowchart";
import { saveFlowchart } from "@/lib/flowchart/flowchart-service";
import type { FlowEdge, FlowNode, FlowNodeType, FlowchartRecord, FlowViewport, SaveStatus } from "@/lib/flowchart/flowchart-types";
import { FlowchartPropertiesPanel } from "./FlowchartPropertiesPanel";
import { FlowchartSaveStatus } from "./FlowchartSaveStatus";
import { FlowchartToolbar } from "./FlowchartToolbar";
import { StartNode } from "./nodes/StartNode";
import { EndNode } from "./nodes/EndNode";
import { ProcessNode } from "./nodes/ProcessNode";
import { DecisionNode } from "./nodes/DecisionNode";
import { InputOutputNode } from "./nodes/InputOutputNode";
import { DocumentNode } from "./nodes/DocumentNode";
import { DatabaseNode } from "./nodes/DatabaseNode";
import { ConnectorNode } from "./nodes/ConnectorNode";

const nodeTypes: NodeTypes = { start: StartNode, end: EndNode, process: ProcessNode, decision: DecisionNode, inputOutput: InputOutputNode, document: DocumentNode, database: DatabaseNode, connector: ConnectorNode };
type Snapshot = { nodes: FlowNode[]; edges: FlowEdge[] };
const clientId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function Editor({ flowchart }: { flowchart: FlowchartRecord }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(flowchart.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(flowchart.edges ?? []);
  const [viewport, setViewport] = useState<FlowViewport>(flowchart.viewport ?? defaultViewport);
  const [name, setName] = useState(flowchart.name);
  const [description, setDescription] = useState(flowchart.description ?? "");
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [editingId, setEditingId] = useState<string>();
  const [editValue, setEditValue] = useState("");
  const ready = useRef(false), savedName = useRef(flowchart.name), history = useRef<Snapshot[]>([]), future = useRef<Snapshot[]>([]);
  const selectedNode = nodes.find(node => node.selected);

  const snapshot = useCallback(() => { history.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) }); if (history.current.length > 50) history.current.shift(); future.current = []; }, [nodes, edges]);
  const save = useCallback(async () => { if (!name.trim()) return setStatus("error"); setStatus("saving"); try { await saveFlowchart({ id: flowchart.id, project_id: flowchart.project_id!, name, description, nodes, edges, viewport }); if (savedName.current !== name.trim()) { await renameFlowchart(flowchart.project_id!, flowchart.id, name); savedName.current = name.trim(); } setStatus("saved"); } catch { setStatus("error"); } }, [description, edges, flowchart.id, flowchart.project_id, name, nodes, viewport]);

  useEffect(() => { if (!ready.current) { ready.current = true; return; } setStatus("unsaved"); const timer = window.setTimeout(save, 1000); return () => window.clearTimeout(timer); }, [nodes, edges, viewport, name, description, save]);

  const addNode = useCallback((type: FlowNodeType) => { snapshot(); setNodes(current => [...current, { id: `${type}-${clientId()}`, type, position: { x: 320 + Math.random() * 120, y: 180 + current.length * 28 }, data: { label: defaultLabels[type], description: nodeDescriptions[type] } }]); }, [setNodes, snapshot]);
  const onConnect = useCallback((connection: Connection) => { snapshot(); setEdges(current => addEdge({ ...connection, id: `edge-${clientId()}`, type: "smoothstep", label: connection.sourceHandle === "yes" ? "Yes" : connection.sourceHandle === "no" ? "No" : undefined }, current)); }, [setEdges, snapshot]);
  const updateNode = useCallback((id: string, data: FlowNode["data"]) => setNodes(current => current.map(node => node.id === id ? { ...node, data } : node)), [setNodes]);
  const clearSelection = useCallback(() => { setNodes(current => current.map(node => ({ ...node, selected: false }))); setEdges(current => current.map(edge => ({ ...edge, selected: false }))); }, [setEdges, setNodes]);
  const removeSelected = useCallback(() => { const selected = nodes.filter(node => node.selected); const important = selected.some(node => node.type === "start" || node.type === "end"); if (important && !window.confirm("Node เริ่มต้นหรือสิ้นสุดมีความสำคัญ ยืนยันการลบหรือไม่?")) return; snapshot(); const ids = new Set(selected.map(node => node.id)); setNodes(current => current.filter(node => !node.selected)); setEdges(current => current.filter(edge => !edge.selected && !ids.has(edge.source) && !ids.has(edge.target))); }, [nodes, setEdges, setNodes, snapshot]);
  const duplicateSelected = useCallback(() => { if (!selectedNode) return; snapshot(); setNodes(current => [...current, { ...selectedNode, id: `${selectedNode.type}-${clientId()}`, selected: false, position: { x: selectedNode.position.x + 40, y: selectedNode.position.y + 40 }, data: { ...selectedNode.data, label: `${selectedNode.data.label} Copy` } }]); }, [selectedNode, setNodes, snapshot]);
  const undo = useCallback(() => { const previous = history.current.pop(); if (!previous) return; future.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) }); setNodes(previous.nodes); setEdges(previous.edges); }, [edges, nodes, setEdges, setNodes]);
  const redo = useCallback(() => { const next = future.current.pop(); if (!next) return; history.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) }); setNodes(next.nodes); setEdges(next.edges); }, [edges, nodes, setEdges, setNodes]);
  const reset = useCallback(() => { if (!window.confirm("Flowchart ปัจจุบันจะถูกแทนที่ด้วยค่าเริ่มต้น ยืนยันหรือไม่?")) return; snapshot(); setNodes(freshDefaultNodes()); setEdges(freshDefaultEdges()); setViewport(defaultViewport); void logFlowchartReset(flowchart.project_id!, flowchart.id, name); }, [flowchart.id, flowchart.project_id, name, setEdges, setNodes, snapshot]);

  useEffect(() => { const key = (event: KeyboardEvent) => { const target = event.target as HTMLElement; const mod = event.ctrlKey || event.metaKey; if (mod && event.key.toLowerCase() === "s") { event.preventDefault(); void save(); return; } if (["INPUT", "TEXTAREA"].includes(target.tagName)) return; if (mod && event.shiftKey && event.key.toLowerCase() === "z") { event.preventDefault(); redo(); } else if (mod && event.key.toLowerCase() === "z") { event.preventDefault(); undo(); } else if (mod && event.key.toLowerCase() === "d") { event.preventDefault(); duplicateSelected(); } else if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); removeSelected(); } else if (event.key === "Escape") clearSelection(); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [clearSelection, duplicateSelected, redo, removeSelected, save, undo]);

  const startEditing = (node: FlowNode) => { setEditingId(node.id); setEditValue(node.data.label); };
  const commitEdit = () => { if (editingId && editValue.trim()) updateNode(editingId, { ...nodes.find(node => node.id === editingId)!.data, label: editValue.trim() }); setEditingId(undefined); };

  return <div className="flow-editor-page"><header className="flow-editor-header"><div><Link href={`/projects/${flowchart.project_id}/flowcharts`}>← Flowcharts</Link><Input aria-label="ชื่อ Flowchart" value={name} maxLength={200} onChange={event => setName(event.target.value)} /><Textarea aria-label="รายละเอียด Flowchart" value={description} rows={1} maxLength={2000} placeholder="รายละเอียด (ไม่บังคับ)" onChange={event => setDescription(event.target.value)} /></div><div><FlowchartSaveStatus status={status} /><Button onClick={() => void save()} loading={status === "saving"}>Save</Button></div></header><div className="flow-editor-grid"><FlowchartToolbar onAdd={addNode} onLayout={() => { snapshot(); setNodes(current => autoLayout(current)); }} onReset={reset} /><main className="flow-canvas-shell"><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeDragStart={snapshot} onNodeDoubleClick={(_, node) => startEditing(node)} onMoveEnd={(_, next) => setViewport(next)} onPaneClick={clearSelection} defaultViewport={viewport} fitView deleteKeyCode={null}><MiniMap pannable zoomable /><Controls /><Background variant={BackgroundVariant.Dots} gap={18} size={1} /></ReactFlow></main><FlowchartPropertiesPanel node={selectedNode} onChange={data => selectedNode && updateNode(selectedNode.id, data)} onDuplicate={duplicateSelected} onDelete={removeSelected} /></div><Modal open={Boolean(editingId)} onClose={() => setEditingId(undefined)} title="แก้ไขข้อความ Node" footer={<><Button onClick={() => setEditingId(undefined)}>ยกเลิก</Button><Button variant="primary" onClick={commitEdit}>บันทึก</Button></>}><FormField label="ข้อความ"><Input autoFocus value={editValue} onChange={event => setEditValue(event.target.value)} onKeyDown={event => { if (event.key === "Enter") commitEdit(); if (event.key === "Escape") setEditingId(undefined); }} /></FormField></Modal></div>;
}

export function FlowchartEditor(props: { flowchart: FlowchartRecord }) { return <ReactFlowProvider><Editor {...props} /></ReactFlowProvider>; }

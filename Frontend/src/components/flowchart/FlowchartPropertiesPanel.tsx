"use client";

import { Button, FormField, Input, Textarea } from "@/components/ui";
import type { FlowNode } from "@/lib/flowchart/flowchart-types";

export function FlowchartPropertiesPanel({ node, onChange, onDuplicate, onDelete }: { node?: FlowNode; onChange: (data: FlowNode["data"]) => void; onDuplicate: () => void; onDelete: () => void }) {
  return <aside className="flow-properties"><h2>Properties</h2>{node ? <><span className="flow-type-label">{node.type}</span><FormField label="ข้อความ"><Input value={node.data.label} onChange={event => onChange({ ...node.data, label: event.target.value })} /></FormField><FormField label="คำอธิบาย"><Textarea rows={4} value={node.data.description ?? ""} onChange={event => onChange({ ...node.data, description: event.target.value })} /></FormField><div className="flow-property-actions"><Button onClick={onDuplicate}>ทำสำเนา</Button><Button variant="danger" onClick={onDelete}>ลบ</Button></div></> : <p>เลือก Node เพื่อแก้ไขข้อความและรายละเอียด</p>}</aside>;
}

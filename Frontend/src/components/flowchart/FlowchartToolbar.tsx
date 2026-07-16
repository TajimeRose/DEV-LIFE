"use client";

import { Button } from "@/components/ui";
import { defaultLabels, nodeDescriptions } from "@/lib/flowchart/default-flowchart";
import type { FlowNodeType } from "@/lib/flowchart/flowchart-types";

const types = Object.keys(defaultLabels) as FlowNodeType[];
export function FlowchartToolbar({ onAdd, onLayout, onReset }: { onAdd: (type: FlowNodeType) => void; onLayout: () => void; onReset: () => void }) {
  return <aside className="flow-toolbar"><div><b>สัญลักษณ์</b><small>กดเพื่อเพิ่มลง Canvas</small></div>{types.map(type => <Button variant="ghost" key={type} title={nodeDescriptions[type]} onClick={() => onAdd(type)}><i className={`flow-symbol flow-symbol-${type}`} /> <span>{defaultLabels[type]}</span></Button>)}<hr /><Button onClick={onLayout}>จัดเรียงอัตโนมัติ</Button><Button variant="danger" onClick={onReset}>รีเซ็ตค่าเริ่มต้น</Button></aside>;
}

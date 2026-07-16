"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { createFlowchartInline, deleteFlowchart, duplicateFlowchart, renameFlowchart } from "@/app/actions/flowcharts";
import { Button, Card, EmptyState, FormField, Input, Modal, Textarea, useToast } from "@/components/ui";
import type { FlowchartRecord } from "@/lib/flowchart/flowchart-types";
import { FlowchartEditor } from "./FlowchartEditor";

export function FlowchartList({ projectId, flowcharts, initialCreate = false }: { projectId: string; flowcharts: FlowchartRecord[]; initialCreate?: boolean }) {
  const [selected, setSelected] = useState<FlowchartRecord>();
  const [createOpen, setCreateOpen] = useState(initialCreate), [renameTarget, setRenameTarget] = useState<FlowchartRecord>(), [createError, setCreateError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const mutate = (action: () => Promise<void>, message: string) => startTransition(async () => { try { await action(); toast(message); setRenameTarget(undefined); router.refresh(); } catch (error) { toast(error instanceof Error ? error.message : "ทำรายการไม่สำเร็จ", "danger"); } });
  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget, formData = new FormData(form);
    setCreateError("");
    startTransition(async () => {
      try {
        const created = await createFlowchartInline(projectId, String(formData.get("name") ?? ""), String(formData.get("description") ?? ""));
        setCreateOpen(false);
        form.reset();
        setSelected(created);
      } catch (error) { setCreateError(error instanceof Error ? error.message : "สร้าง Flowchart ไม่สำเร็จ"); }
    });
  };
  if (selected) return <FlowchartEditor key={selected.id} flowchart={selected} embedded onClose={() => { setSelected(undefined); router.refresh(); }} />;
  return <><div className="flow-list-actions"><Button variant="primary" onClick={() => setCreateOpen(true)}>＋ สร้าง Flowchart</Button></div>{flowcharts.length ? <div className="flowchart-card-grid">{flowcharts.map(flowchart => <Card as="article" className="flowchart-card" key={flowchart.id}><div><span>{flowchart.nodes.length} Nodes</span><h2>{flowchart.name}</h2><p>{flowchart.description || "ไม่มีรายละเอียด"}</p><small>แก้ไขล่าสุด {new Date(flowchart.updated_at).toLocaleString("th-TH")}</small></div><div className="flowchart-card-actions"><Button variant="primary" onClick={() => setSelected(flowchart)}>เปิด</Button><Button onClick={() => setRenameTarget(flowchart)}>เปลี่ยนชื่อ</Button><Button disabled={pending} onClick={() => mutate(() => duplicateFlowchart(projectId, flowchart.id), "ทำสำเนาแล้ว")}>ทำสำเนา</Button><Button variant="danger" disabled={pending} onClick={() => window.confirm(`ลบ “${flowchart.name}” หรือไม่?`) && mutate(() => deleteFlowchart(projectId, flowchart.id), "ลบ Flowchart แล้ว")}>ลบ</Button></div></Card>)}</div> : <EmptyState title="ยังไม่มี Flowchart" description="สร้าง Flowchart แรกแล้วเริ่มออกแบบจาก Canvas ว่างได้ทันที" action={<Button variant="primary" onClick={() => setCreateOpen(true)}>สร้าง Flowchart</Button>} />}
    <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="สร้าง Flowchart" description="เริ่มต้นจาก Canvas ว่างและเพิ่มสัญลักษณ์ได้ตามต้องการ" footer={<><Button onClick={() => setCreateOpen(false)}>ยกเลิก</Button><Button form="create-flowchart-form" type="submit" variant="primary" loading={pending}>สร้าง Flowchart</Button></>}><form id="create-flowchart-form" className="flowchart-modal-form" onSubmit={create}><FormField label="ชื่อ"><Input name="name" required maxLength={200} autoFocus /></FormField><FormField label="รายละเอียด"><Textarea name="description" maxLength={2000} rows={4} /></FormField>{createError && <p className="form-error" role="alert">{createError}</p>}</form></Modal>
    <Modal open={Boolean(renameTarget)} onClose={() => setRenameTarget(undefined)} title="เปลี่ยนชื่อ Flowchart" footer={<><Button onClick={() => setRenameTarget(undefined)}>ยกเลิก</Button><Button form="rename-flowchart-form" type="submit" variant="primary" loading={pending}>บันทึก</Button></>}><form id="rename-flowchart-form" onSubmit={event => { event.preventDefault(); const name = new FormData(event.currentTarget).get("name"); if (renameTarget && typeof name === "string") mutate(() => renameFlowchart(projectId, renameTarget.id, name), "เปลี่ยนชื่อแล้ว"); }}><FormField label="ชื่อ"><Input name="name" defaultValue={renameTarget?.name} required maxLength={200} autoFocus /></FormField></form></Modal>
  </>;
}

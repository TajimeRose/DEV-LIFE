import type { SaveStatus } from "@/lib/flowchart/flowchart-types";

const labels: Record<SaveStatus, string> = { saved: "บันทึกแล้ว", saving: "กำลังบันทึก…", unsaved: "ยังไม่ได้บันทึก", error: "บันทึกไม่สำเร็จ" };
export function FlowchartSaveStatus({ status }: { status: SaveStatus }) { return <span className={`flow-save-status ${status}`} aria-live="polite">{labels[status]}</span>; }

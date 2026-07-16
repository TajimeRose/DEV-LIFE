"use client";

import { Button, Card } from "@/components/ui";

export default function WorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <Card className="empty-workspace"><span className="ui-badge ui-badge-danger">ERROR</span><h1>โหลด workspace ไม่สำเร็จ</h1><p className="empty-copy">เกิดข้อผิดพลาดชั่วคราว กรุณาลองอีกครั้ง</p><Button variant="primary" onClick={reset}>ลองอีกครั้ง</Button></Card>;
}

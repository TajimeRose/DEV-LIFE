"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptProjectInvitation } from "@/app/actions/team";
import { Button } from "@/components/ui";

export function InvitationAcceptance({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  return <div className="invitation-actions">{error && <p className="form-error" role="alert">{error}</p>}<Button variant="primary" loading={pending} onClick={() => startTransition(async () => {
    try {
      await acceptProjectInvitation(token);
      router.push("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "รับคำเชิญไม่สำเร็จ");
    }
  })}>เข้าร่วมโปรเจกต์</Button><Button onClick={() => router.push("/projects")}>กลับหน้าโปรเจกต์</Button></div>;
}

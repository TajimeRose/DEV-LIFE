"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signInWithGitHub } from "@/app/auth/actions";
import { Button } from "@/components/ui";

function GitHubSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return <Button className="auth-github" type="submit" loading={pending}>
    {!pending && <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.58 2 12.24c0 4.52 2.87 8.36 6.84 9.72.5.1.68-.22.68-.49v-1.91c-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.97a9.3 9.3 0 0 1 2.5.34c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.06.36.32.68.94.68 1.89v2.8c0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.24C22 6.58 17.52 2 12 2Z" /></svg>}
    <span>{pending ? "กำลังเชื่อมต่อ GitHub..." : label}</span>
  </Button>;
}

export function GitHubAuthButton({ label, next }: { label: string; next?: string }) {
  const [state, action] = useActionState(signInWithGitHub, null);

  return <div className="auth-oauth">
    <form action={action}>{next && <input type="hidden" name="next" value={next} />}<GitHubSubmit label={label} /></form>
    {state?.error && <p className="auth-error" role="alert">{state.error}</p>}
  </div>;
}

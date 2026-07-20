"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type RealtimeTable = "notes" | "tasks" | "flowcharts" | "project_members" | "project_invitations";

export function useProjectRealtime(table: RealtimeTable, projectId: string, onChange: () => void) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`project:${projectId}:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter: `project_id=eq.${projectId}` }, () => onChangeRef.current())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, table]);
}

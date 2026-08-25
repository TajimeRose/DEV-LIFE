"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type RealtimeTable = "notes" | "tasks" | "flowcharts" | "project_members" | "project_invitations" | "activities";

export function useProjectRealtime(table: RealtimeTable, projectId: string, onChange: () => void) {
  const onChangeRef = useRef(onChange);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const supabase = createClient();

    const handleChange = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Debounce realtime refreshes by 250ms to prevent rapid network spam
      debounceTimerRef.current = setTimeout(() => {
        onChangeRef.current();
      }, 250);
    };

    const channel = supabase
      .channel(`project:${projectId}:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter: `project_id=eq.${projectId}` }, handleChange)
      .subscribe();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [projectId, table]);
}


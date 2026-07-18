import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/lib/database.types";
import { stableUuid } from "./stable-id.ts";

export type RepositoryActivityInput = Omit<
  TablesInsert<"project_activity_logs">,
  "id" | "created_at"
> & {
  idempotencyKey: string;
};

export function isDuplicateDatabaseError(error: { code?: string } | null) {
  return error?.code === "23505";
}

export async function repositoryActivityId(input: Pick<RepositoryActivityInput, "project_id" | "idempotencyKey">) {
  return stableUuid("project-activity", `${input.project_id}:${input.idempotencyKey}`);
}

export async function insertRepositoryActivity(
  supabase: SupabaseClient<Database>,
  input: RepositoryActivityInput,
) {
  const { idempotencyKey, ...activity } = input;
  void idempotencyKey;
  const id = await repositoryActivityId(input);
  const { error } = await supabase.from("project_activity_logs").insert({ id, ...activity });
  if (error && !isDuplicateDatabaseError(error)) throw new Error(error.message);
  return { id, inserted: !error };
}

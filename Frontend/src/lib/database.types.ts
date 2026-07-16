export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
import type { FlowchartRecord } from "@/lib/flowchart/flowchart-types";

type Table<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };

export type Project = { id: string; name: string; status: string; created_at: string; user_id: string };
export type Task = { id: string; project_id: string; title: string; description: string; status: string; priority: string; created_at: string };
export type Note = { id: string; project_id: string; title: string; content: Json; created_at: string };
export type Board = { id: string; project_id: string; name: string };
export type Activity = { id: string; user_id: string; project_id: string; action: string; entity_type: string; entity_id: string; metadata: Json; created_at: string };
export type Version = { id: string; user_id: string; project_id: string; entity_type: string; entity_id: string; old_data: Json; new_data: Json; change_summary: string; created_at: string };

export type Database = { public: { Tables: {
  projects: Table<Project, { id?: string; name: string; status: string; created_at?: string; user_id: string }, Partial<Omit<Project, "id" | "created_at" | "user_id">>>;
  tasks: Table<Task, { id: string; project_id: string; title: string; description: string; status: string; priority: string; created_at?: string }, Partial<Omit<Task, "id" | "project_id" | "created_at">>>;
  notes: Table<Note, { id: string; project_id: string; title: string; content: Json; created_at?: string }, Partial<Omit<Note, "id" | "project_id" | "created_at">>>;
  boards: Table<Board, { id: string; project_id: string; name: string }, Partial<Omit<Board, "id" | "project_id">>>;
  activities: Table<Activity, { id: string; user_id: string; project_id: string; action: string; entity_type: string; entity_id: string; metadata: Json; created_at?: string }, Partial<Omit<Activity, "id" | "created_at">>>;
  versions: Table<Version, { id: string; user_id: string; project_id: string; entity_type: string; entity_id: string; old_data: Json; new_data: Json; change_summary: string; created_at?: string }, Partial<Omit<Version, "id" | "created_at">>>;
  flowcharts: Table<FlowchartRecord, Omit<FlowchartRecord, "created_at" | "updated_at"> & { created_at?: string; updated_at?: string }, Partial<Omit<FlowchartRecord, "id" | "user_id" | "created_at">>>;
}; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> } };

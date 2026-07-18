import type { IconName } from "@/components/ui/icons";

export type NavItem = { href: string; label: string; icon: IconName; group: "Workspace" | "Tools" };
export type Priority = "ทั่วไป" | "สำคัญ" | "สำคัญมาก";
export type Task = { id: number; title: string; done: boolean; priority: Priority };
export type Card = { id: number; title: string; tag: string };
export type Columns = Record<"Backlog" | "In progress" | "Review" | "Done", Card[]>;

export const navigation: NavItem[] = [
  { href: "/dashboard", label: "ภาพรวม", icon: "overview", group: "Workspace" },
  { href: "/notes", label: "โน้ต", icon: "notes", group: "Workspace" },
  { href: "/checklists", label: "งาน", icon: "tasks", group: "Workspace" },
  { href: "/board", label: "บอร์ด", icon: "board", group: "Workspace" },
  { href: "/flowchart", label: "แผนผัง", icon: "flowchart", group: "Workspace" },
  { href: "/settings/integrations", label: "Repository", icon: "repository", group: "Workspace" },
  { href: "/settings", label: "การตั้งค่า", icon: "settings", group: "Tools" },
  { href: "/activity", label: "กิจกรรม", icon: "activity", group: "Tools" },
];

export const initialTasks: Task[] = [
  { id: 1, title: "สรุป onboarding user flow", done: true, priority: "สำคัญมาก" },
  { id: 2, title: "ออกแบบ GitHub read-only view", done: false, priority: "สำคัญมาก" },
  { id: 3, title: "เขียน API design document", done: false, priority: "สำคัญ" },
];

export const initialColumns: Columns = {
  Backlog: [{ id: 1, title: "Define beta metrics", tag: "PRODUCT" }],
  "In progress": [{ id: 2, title: "Onboarding flow", tag: "DESIGN" }, { id: 3, title: "Note editor", tag: "FEATURE" }],
  Review: [{ id: 4, title: "GitHub context panel", tag: "GITHUB" }],
  Done: [{ id: 5, title: "Workspace shell", tag: "SYSTEM" }],
};

export const newsItems = [
  { id: 2, tag: "Web", source: "Frontend Weekly", title: "Patterns ใหม่สำหรับ React state", summary: "จัด state ตามขอบเขตการใช้งานและลด derived state ที่ไม่จำเป็น" },
  { id: 3, tag: "Security", source: "Security Digest", title: "Supply-chain checklist สำหรับทีมเว็บ", summary: "ตรวจ dependency, lockfile และสิทธิ์ของ automation อย่างเป็นระบบ" },
];

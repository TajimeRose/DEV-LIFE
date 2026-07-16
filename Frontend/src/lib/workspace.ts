export type NavItem = { href: string; label: string; icon: string; group: "Workspace" | "Tools" };
export type Priority = "ทั่วไป" | "สำคัญ" | "สำคัญมาก";
export type Task = { id: number; title: string; done: boolean; priority: Priority };
export type Card = { id: number; title: string; tag: string };
export type Columns = Record<"Backlog" | "In progress" | "Review" | "Done", Card[]>;

export const navigation: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "⌂", group: "Workspace" },
  { href: "/notes", label: "Notes", icon: "N", group: "Workspace" },
  { href: "/checklists", label: "Tasks", icon: "✓", group: "Workspace" },
  { href: "/flowchart", label: "Flowcharts", icon: "◇", group: "Workspace" },
  { href: "/board", label: "Board", icon: "▦", group: "Tools" },
  { href: "/settings", label: "Settings", icon: "⚙", group: "Tools" },
  { href: "/activity", label: "Activity", icon: "↻", group: "Tools" },
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
  { id: 1, tag: "AI", source: "AI Engineering", title: "Agentic workflows ที่ทีมเล็กนำไปใช้ได้", summary: "แนวทางแบ่งงานให้ AI โดยคง human approval ไว้ทุกจุดสำคัญ" },
  { id: 2, tag: "Web", source: "Frontend Weekly", title: "Patterns ใหม่สำหรับ React state", summary: "จัด state ตามขอบเขตการใช้งานและลด derived state ที่ไม่จำเป็น" },
  { id: 3, tag: "Security", source: "Security Digest", title: "Supply-chain checklist สำหรับทีมเว็บ", summary: "ตรวจ dependency, lockfile และสิทธิ์ของ automation อย่างเป็นระบบ" },
];

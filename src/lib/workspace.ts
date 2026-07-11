export type NavItem = { href: string; label: string; icon: string };
export type Priority = "สูง" | "กลาง" | "ต่ำ";
export type Task = { id: number; title: string; done: boolean; priority: Priority };
export type Card = { id: number; title: string; tag: string };
export type Columns = Record<"Backlog" | "In progress" | "Review" | "Done", Card[]>;

export const navigation: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "⌂" },
  { href: "/notes", label: "Notes", icon: "▤" },
  { href: "/checklists", label: "Checklists", icon: "✓" },
  { href: "/board", label: "Board", icon: "▦" },
  { href: "/flowchart", label: "Flowchart", icon: "◇" },
  { href: "/templates", label: "Templates", icon: "◫" },
  { href: "/search", label: "Search", icon: "⌕" },
  { href: "/inbox", label: "Inbox", icon: "↓" },
  { href: "/activity", label: "Activity", icon: "◎" },
  { href: "/context-map", label: "Context map", icon: "⌘" },
  { href: "/ai-tools", label: "AI tools", icon: "✦" },
  { href: "/github", label: "GitHub", icon: "⑂" },
  { href: "/news", label: "Dev news", icon: "◉" },
];

export const initialTasks: Task[] = [
  { id: 1, title: "สรุป onboarding user flow", done: true, priority: "สูง" },
  { id: 2, title: "ออกแบบ GitHub read-only view", done: false, priority: "สูง" },
  { id: 3, title: "เขียน API design document", done: false, priority: "กลาง" },
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

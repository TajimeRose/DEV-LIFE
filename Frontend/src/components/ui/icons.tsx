export type IconName =
  | "overview"
  | "notes"
  | "tasks"
  | "board"
  | "flowchart"
  | "repository"
  | "settings"
  | "activity"
  | "search"
  | "projects"
  | "team"
  | "inbox"
  | "templates"
  | "contextMap"
  | "ai";

const paths: Record<IconName, React.ReactNode> = {
  overview: (
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10.5V20h13v-9.5" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  notes: (
    <>
      <path d="M6 3.5h9l3 3V20.5H6z" />
      <path d="M15 3.5v3h3" />
      <path d="M9 11h6M9 15h6" />
    </>
  ),
  tasks: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  board: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M9 4v16M15 4v16" />
    </>
  ),
  flowchart: (
    <>
      <rect x="4" y="3" width="6" height="5" rx="1" />
      <rect x="14" y="16" width="6" height="5" rx="1" />
      <path d="M7 8v4h10v4M7 12v4" />
      <circle cx="7" cy="18.5" r="2.5" />
    </>
  ),
  repository: (
    <>
      <path d="M5 4h11a3 3 0 0 1 3 3v13H7a2 2 0 0 1-2-2z" />
      <path d="M5 17a3 3 0 0 1 3-3h11M9 8h6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 13.5v-3l-2-.7a7 7 0 0 0-.8-1.8l.9-1.9L15 4l-1.9.9a7 7 0 0 0-2.2 0L9 4 6.9 6.1 7.8 8a7 7 0 0 0-.8 1.8l-2 .7v3l2 .7a7 7 0 0 0 .8 1.8l-.9 1.9L9 20l1.9-.9a7 7 0 0 0 2.2 0l1.9.9 2.1-2.1-.9-1.9a7 7 0 0 0 .8-1.8z" />
    </>
  ),
  activity: (
    <>
      <path d="M4 12h4l2-6 4 12 2-6h4" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4.5 4.5" />
    </>
  ),
  projects: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M8 5V3h8v2M8 10h8" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M3.5 20v-2a5.5 5.5 0 0 1 11 0v2M14.5 15.5a4.5 4.5 0 0 1 6 4.5" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </>
  ),
  templates: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </>
  ),
  contextMap: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="18" r="2" />
      <line x1="7" y1="7" x2="10" y2="10" />
      <line x1="17" y1="7" x2="14" y2="10" />
      <line x1="7" y1="17" x2="10" y2="14" />
      <line x1="17" y1="17" x2="14" y2="14" />
    </>
  ),
  ai: (
    <>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}

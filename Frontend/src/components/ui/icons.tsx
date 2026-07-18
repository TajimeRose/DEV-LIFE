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
  | "projects";

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

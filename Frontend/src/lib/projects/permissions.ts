export const projectRoles = ["owner", "maintainer", "developer", "reviewer", "viewer"] as const;
export const invitationRoles = ["maintainer", "developer", "reviewer", "viewer"] as const;

export type ProjectRole = (typeof projectRoles)[number];
export type InvitationRole = (typeof invitationRoles)[number];

export function normalizeProjectRole(role: string): ProjectRole {
  return projectRoles.includes(role as ProjectRole) ? role as ProjectRole : "viewer";
}

export function canEditProject(role: string) {
  const normalized = normalizeProjectRole(role);
  return normalized === "owner" || normalized === "maintainer" || normalized === "developer";
}

export function canManageTeam(role: string) {
  return normalizeProjectRole(role) === "owner";
}

export function roleLabel(role: string) {
  const labels: Record<ProjectRole, string> = {
    owner: "เจ้าของ",
    maintainer: "ผู้ดูแล",
    developer: "ผู้แก้ไข",
    reviewer: "ผู้ตรวจสอบ",
    viewer: "ผู้อ่าน",
  };
  return labels[normalizeProjectRole(role)];
}

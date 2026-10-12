export type AssignUserRow = {
  userId: string;
  userName: string;
  departmentId?: string;
  departmentName?: string;
};

export type FlatOption = { label: string; value: string };

const GENDER_LABEL: Record<string, string> = {
  MALE: "男",
  FEMALE: "女",
  NONE: "保密",
};

const WORK_STATUS_LABEL: Record<string, string> = {
  REST: "休息",
  WORKING: "在岗",
  LEAVE_POST: "离岗",
  AWAY_BUSINESS: "出差",
  ASK_LEAVE: "请假",
};

export function flattenOrganizations(raw: unknown): FlatOption[] {
  const flatten = (nodes: unknown[], acc: FlatOption[]): FlatOption[] => {
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const row = node as Record<string, unknown>;
      const id = String(row.id ?? "");
      const name = String(row.name ?? id);
      if (id) {
        acc.push({ label: name, value: id });
      }
      const children = row.children;
      if (Array.isArray(children) && children.length) {
        flatten(children, acc);
      }
    }
    return acc;
  };

  const root = Array.isArray(raw) ? raw : [];
  return flatten(root, []);
}

export function formatUserGender(value: unknown): string {
  const key = String(value || "");
  return key ? GENDER_LABEL[key] || key : "--";
}

export function formatUserPositions(value: unknown): string {
  if (!Array.isArray(value) || !value.length) {
    return "--";
  }
  return value
    .map((item) => {
      const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      return String(row.name ?? "");
    })
    .filter(Boolean)
    .join(",");
}

export function formatWorkStatus(value: unknown): string {
  const key = String(value || "");
  return key ? WORK_STATUS_LABEL[key] || key : "--";
}

export function mapUsersToAssignRows(rows: Record<string, unknown>[]): AssignUserRow[] {
  const users: AssignUserRow[] = [];
  for (const row of rows) {
    const organizations = Array.isArray(row.organizations) ? row.organizations : [];
    const firstOrg = (organizations[0] && typeof organizations[0] === "object" ? organizations[0] : {}) as Record<string, unknown>;
    const userId = String(row.userId ?? row.id ?? "");
    const userName = String(row.name ?? row.userName ?? userId);
    if (!userId) {
      continue;
    }
    users.push({
      userId,
      userName,
      departmentId: String(firstOrg.id ?? row.organizationId ?? "") || undefined,
      departmentName: String(firstOrg.name ?? row.organizationName ?? "") || undefined,
    });
  }
  return users;
}

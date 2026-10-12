import type { GroupPayload } from "@g2-contract/command-dispatch";

export type GroupForm = Omit<GroupPayload, "groupLevel"> & { groupLevel: number | null };

export function changeMemberSelection(
  current: readonly string[],
  rows: readonly { code: string; id?: string }[],
  selected: boolean,
): string[] {
  const codes = new Set(rows.map((row) => row.code));
  return selected ? [...new Set([...current, ...codes])] : current.filter((code) => !codes.has(code));
}

export function buildGroupPayload(form: GroupForm): GroupPayload {
  if (!/^\d{1,5}$/.test(form.code)) {
    throw new Error("对讲组编号须为 0–99999 的数字");
  }
  if (!form.name.trim()) {
    throw new Error("请输入对讲组名称");
  }
  const level = form.groupLevel;
  if (level === null || !Number.isInteger(level) || level < 0 || level > 100) {
    throw new Error("对讲组等级须为 0–100 的整数");
  }
  return { ...form, name: form.name.trim(), groupLevel: level };
}

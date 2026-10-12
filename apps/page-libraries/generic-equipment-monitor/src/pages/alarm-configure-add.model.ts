/** 报警规则编辑器：模式由宿主注入的 page props 决定（非 URL applicationCode）。 */

export type AlarmConfigEditorViewMode = "add" | "edit" | "detail" | "copy";

export function resolveAlarmConfigEditorMode(input: { mode?: string; copy?: string; ruleId?: string }): AlarmConfigEditorViewMode {
  const mode = String(input.mode || "").trim();
  if (mode === "detail") {
    return "detail";
  }
  if (mode === "add" || (!input.ruleId && mode !== "edit")) {
    return "add";
  }
  if (String(input.copy || "") === "1" || mode === "copy") {
    return "copy";
  }
  return "edit";
}

export function alarmConfigEditorTitle(mode: AlarmConfigEditorViewMode): string {
  switch (mode) {
    case "add":
      return "报警规则-新增";
    case "copy":
      return "报警规则-复制";
    case "detail":
      return "报警规则-详情";
    default:
      return "报警规则-编辑";
  }
}

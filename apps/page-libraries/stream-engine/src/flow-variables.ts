function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** 流程网关按条件字段 ID 读取变量；提交表单数据本身不能替代 variables。 */
export function buildFlowVariables(flowJson: unknown, formData: Record<string, unknown>): Record<string, unknown> {
  let root: unknown = flowJson;
  if (typeof root === "string") {
    try {
      root = JSON.parse(root);
    } catch {
      return {};
    }
  }
  const variables: Record<string, unknown> = {};
  const visit = (raw: unknown): void => {
    const node = recordOf(raw);
    if (!Object.keys(node).length) return;
    const props = recordOf(node.props);
    const formUser = String(props.formUser ?? "");
    if (props.assignedType === "FORM_USER" && formUser && formData[formUser] != null) {
      variables[formUser] = formData[formUser];
    }
    if (Array.isArray(props.groups)) {
      for (const group of props.groups) {
        const conditions = recordOf(group).conditions;
        if (!Array.isArray(conditions)) continue;
        for (const rawCondition of conditions) {
          const condition = recordOf(rawCondition);
          const key = String(condition.id ?? "");
          if (!key) continue;
          const value = formData[key];
          if (condition.name === "DeptPicker") {
            variables[key] = Array.isArray(value) ? value.map((item) => recordOf(item).id).filter((id) => id != null) : [];
          } else if (["VacationLength", "DepartureTimeLength", "OvertimeLength"].includes(String(condition.name))) {
            const hours = Number(condition.name === "OvertimeLength" ? recordOf(value).name : value);
            variables[key] = Number.isFinite(hours) ? Math.floor((hours / 8) * 100) / 100 : "";
          } else {
            variables[key] = value ?? "";
          }
        }
      }
    }
    if (Array.isArray(node.branchs)) node.branchs.forEach(visit);
    visit(node.children);
  };
  visit(root);
  return variables;
}

export function backLogTitle(
  items: Array<{ id?: string; name?: string; props?: Record<string, unknown> }>,
  formData: Record<string, unknown>,
): string | undefined {
  const visit = (entries: typeof items): string | undefined => {
    for (const item of entries) {
      if (item.name === "TextInput" && item.props?.useAsBackLogTitle) {
        const title = String(formData[String(item.id)] ?? "").trim();
        if (title) return title;
      }
      if (Array.isArray(item.props?.items)) {
        const nested = visit(item.props.items as typeof items);
        if (nested) return nested;
      }
    }
    return undefined;
  };
  return visit(items);
}

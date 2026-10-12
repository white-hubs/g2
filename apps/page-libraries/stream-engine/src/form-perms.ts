import type { FormSchemaItem } from "./form-schema";

export type FormItemPerm = "R" | "E" | "H";

export type FormPermEntry = {
  id: string;
  perm: FormItemPerm;
  required?: boolean;
  title?: string;
};

export type FieldPermission = {
  show: boolean;
  readonly: boolean;
};

/** 对齐旧 FormRender.getNode：在 flowJson 树中按 id 找节点 */
export function getFlowNode(node: unknown, nodeId: string | null): Record<string, unknown> | null {
  if (!node || typeof node !== "object" || !nodeId) {
    return null;
  }
  const record = node as Record<string, unknown>;
  if (String(record.id) === nodeId) {
    return record;
  }
  if (Array.isArray(record.branchs)) {
    for (const branch of record.branchs) {
      const found = getFlowNode(branch, nodeId);
      if (found) {
        return found;
      }
    }
  }
  if (record.children) {
    return getFlowNode(record.children, nodeId);
  }
  return null;
}

function parseJsonObject(raw: unknown): unknown {
  if (!raw) {
    return undefined;
  }
  if (typeof raw === "object") {
    return raw;
  }
  try {
    return JSON.parse(String(raw));
  } catch {
    return undefined;
  }
}

function asPermList(value: unknown): FormPermEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const result: FormPermEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    const id = record.id;
    const perm = record.perm;
    if (id == null || (perm !== "R" && perm !== "E" && perm !== "H")) {
      continue;
    }
    result.push({
      id: String(id),
      perm,
      required: Boolean(record.required),
      title: record.title ? String(record.title) : undefined,
    });
  }
  return result;
}

/**
 * 对齐旧 FormRender.formPerms：
 * - DETAIL + REJECT/UNDO → runningInfo.formPerms
 * - 否则取当前节点 props.formPerms（EXTERNAL 用 outerFormPerms）
 */
export function resolveFormPerms(input: {
  processType: "add" | "detail";
  nodeId: string;
  flowJson?: unknown;
  processJson?: unknown;
  callType?: string;
  runningStatus?: string;
  runningFormPerms?: unknown;
}): FormPermEntry[] {
  if (input.processType === "detail" && ["REJECT", "UNDO"].includes(String(input.runningStatus ?? ""))) {
    return asPermList(input.runningFormPerms);
  }
  const flowTree = parseJsonObject(input.processType === "detail" ? (input.processJson ?? input.flowJson) : input.flowJson);
  const node = getFlowNode(flowTree, input.nodeId);
  if (!node) {
    return [];
  }
  const props = (node.props && typeof node.props === "object" ? node.props : {}) as Record<string, unknown>;
  if (input.callType === "EXTERNAL") {
    return asPermList(props.outerFormPerms);
  }
  return asPermList(props.formPerms);
}

export function getFieldPermission(
  item: FormSchemaItem,
  formPerms: FormPermEntry[],
  processType: "add" | "detail",
  nodeId: string,
): FieldPermission {
  if (nodeId === "") {
    return { show: true, readonly: true };
  }
  const findIndex = formPerms.findIndex((entry) => entry.id === item.id);
  if (formPerms.length === 0 || findIndex === -1) {
    return { show: true, readonly: processType === "detail" };
  }
  const perm = formPerms[findIndex]!.perm;
  return {
    show: perm !== "H",
    readonly: perm === "R",
  };
}

function hasDisplayValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("name" in record) {
      return Boolean(record.name);
    }
    if ("id" in record) {
      return record.id != null && record.id !== "";
    }
    return Object.keys(record).length > 0;
  }
  return value !== undefined && value !== null && value !== "";
}

/** 只读且无值时不展示（对齐旧 getParamsHandler 默认逻辑） */
export function shouldShowField(item: FormSchemaItem, permission: FieldPermission, value: unknown): boolean {
  if (!permission.show) {
    return false;
  }
  if (permission.readonly && item.name !== "AlarmRecords" && !hasDisplayValue(value)) {
    return false;
  }
  return true;
}

export function resolveNodeId(processType: "add" | "detail", taskKey?: string): string {
  if (processType === "add") {
    return "root";
  }
  return taskKey ?? "";
}

import type { DataDictionary } from "@g2-contract/dictionary";
import type { DepartmentNode } from "@g2-contract/ouaa";

import { configurationRecord } from "../dispatch-map-config/config";

export const PRIORITY_CONFIG_CODE = "COMMAND_DISPATCH_PRIORITY_DEPARTMENT";

export function departmentName(tree: DepartmentNode[], id: string): string {
  for (const node of tree) {
    if (node.id === id) return node.name;
    const child = node.children?.length ? departmentName(node.children, id) : id;
    if (child !== id) return child;
  }
  return id;
}

export function priorityRecord(records: DataDictionary[], departmentId: string): DataDictionary {
  if (!departmentId) throw new Error("请选择优先部门");
  return configurationRecord(records, PRIORITY_CONFIG_CODE, "departmentId", "优先部门", departmentId);
}

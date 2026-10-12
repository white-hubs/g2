import type { FormFlowBusiness } from "@g2-client/stream-engine/client";

import { processObject } from "./process-design";

export type WorkOrderPermissionType = "ALL" | "USER" | "ROLE" | "DEPARTMENT";
export type WorkOrderChoice = { id: string | number; name: string };
export type WorkOrderSettings = {
  businessType: string;
  formGroupId: string | number | null;
  shortName: string;
  permissionType: WorkOrderPermissionType;
  permissionIds: Array<string | number>;
  permissionList: WorkOrderChoice[];
  enable: boolean;
};

const permissionTypes: WorkOrderPermissionType[] = ["ALL", "USER", "ROLE", "DEPARTMENT"];

export function workOrderChoices(value: unknown): WorkOrderChoice[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const item = processObject(row);
    if (typeof item.id !== "string" && typeof item.id !== "number") return [];
    return [{ id: item.id, name: String(item.name ?? item.id) }];
  });
}

export function initialWorkOrderSettings(groupId?: string | number | null): WorkOrderSettings {
  return {
    businessType: "",
    formGroupId: groupId ?? null,
    shortName: "未命名",
    permissionType: "ALL",
    permissionIds: [],
    permissionList: [],
    enable: true,
  };
}

export function restoreWorkOrderSettings(detail: FormFlowBusiness): WorkOrderSettings {
  const permissionIds = Array.isArray(detail.permissionIds)
    ? detail.permissionIds.filter((id): id is string | number => typeof id === "string" || typeof id === "number")
    : [];
  const permissionList = workOrderChoices(detail.permissionList);
  return {
    businessType: String(detail.businessType ?? ""),
    formGroupId: typeof detail.formGroupId === "string" || typeof detail.formGroupId === "number" ? detail.formGroupId : null,
    shortName: String(detail.shortName ?? ""),
    permissionType: permissionTypes.includes(detail.permissionType as WorkOrderPermissionType)
      ? (detail.permissionType as WorkOrderPermissionType)
      : "ALL",
    permissionIds,
    permissionList: permissionIds.map((id) => permissionList.find((item) => String(item.id) === String(id)) ?? { id, name: String(id) }),
    enable: detail.enable === undefined ? true : Boolean(detail.enable),
  };
}

export function updateWorkOrderPermissions(settings: WorkOrderSettings, choices: WorkOrderChoice[]): void {
  settings.permissionList = choices;
  settings.permissionIds = choices.map((choice) => choice.id);
}

export function designNameIssue(value: string, title = "表单名称"): string | undefined {
  const text = value.trim();
  if (!text) return `${title}未设置`;
  if (text.length > 20 || !/^[\u4e00-\u9fa5a-zA-Z0-9]+$/.test(text)) return `${title}仅支持20字以内的中文英文和数字`;
  return undefined;
}

export function validateWorkOrderBase(name: string, settings: WorkOrderSettings): string[] {
  const errors: string[] = [];
  for (const [title, value] of [
    ["表单名称", name],
    ["表单简称", settings.shortName],
  ]) {
    const issue = designNameIssue(value!, title);
    if (issue) errors.push(issue);
  }
  if (settings.formGroupId == null || settings.formGroupId === "") errors.push("表单分组未设置");
  if (!permissionTypes.includes(settings.permissionType)) errors.push("请选择谁可以使用");
  const subject = { USER: "用户", ROLE: "角色", DEPARTMENT: "部门" };
  if (settings.permissionType !== "ALL" && !settings.permissionIds.length)
    errors.push(`请选择可以使用的${subject[settings.permissionType]}`);
  return errors;
}

export function buildWorkOrderPayload(
  common: Record<string, unknown>,
  settings: WorkOrderSettings,
  options: { formId?: string; isCopy: boolean; formType: string; applicationCode?: string; origin: string },
): Record<string, unknown> {
  return {
    ...common,
    id: options.isCopy ? null : options.formId || null,
    type: options.formType,
    businessType: settings.businessType || undefined,
    formGroupId: settings.formGroupId,
    shortName: settings.shortName.trim(),
    enable: settings.enable,
    permissionType: settings.permissionType,
    permissionIds: [...settings.permissionIds],
    application: options.formType === "CUSTOM_FORM" ? options.applicationCode : undefined,
    qrCodeUrl: `${options.origin}/streamengineH5/public-form/?processType=ADD`,
  };
}

export function workOrderApplication(applicationCode?: string, raw?: string | null): { code?: string; name?: string } {
  let stored: Record<string, unknown> = {};
  try {
    stored = processObject(raw ? JSON.parse(raw) : {});
  } catch {
    stored = {};
  }
  const code = applicationCode && applicationCode !== "stream-engine" ? applicationCode : stored.code;
  return { code: typeof code === "string" ? code : undefined, name: typeof stored.name === "string" ? stored.name : undefined };
}

export function workOrderCatalogApplication(application: { code?: string; name?: string }): string | undefined {
  return application.code === "WORK_PERMIT_MANAGE" || application.name === "作业管理" ? "WORK_PERMIT" : undefined;
}

export function decodeWorkOrderReturnUrl(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

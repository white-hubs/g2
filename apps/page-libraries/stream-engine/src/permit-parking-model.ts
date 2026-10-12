import type { FormSchemaItem } from "./form-schema";

export type WorkPermitItem = {
  id?: string | number;
  itemName?: string;
  typeName?: string;
  workPermitLevel?: string;
  custom?: boolean;
  aiRecognitionEnabled?: boolean;
  confirmResult?: "NORMAL" | "ABNORMAL";
  description?: string;
  attachments?: Array<{ id?: string; uid?: string; name?: string | null; path?: string | null; url?: string }>;
  confirmSource?: "MANUAL" | "AI";
  aiRecognitionStatus?: "SUCCESS" | "UNRECOGNIZED" | "FAILED";
  aiRecognitionMessage?: string;
};

export function workPermitItemKey(item: WorkPermitItem): string {
  return `${item.custom ? "custom" : "remote"}-${item.id ?? item.itemName ?? ""}`;
}

export function effectiveWorkPermitItems(items: WorkPermitItem[]): WorkPermitItem[] {
  return items
    .filter((item) => !item.custom || Boolean(item.itemName?.trim()))
    .map((item) => ({ ...item, itemName: item.custom ? item.itemName?.trim() : item.itemName, attachments: item.attachments ?? [] }));
}

/** 旧控件在提交前由 validator 清理手工空项；G2 的统一提交需要显式执行同一转换。 */
export function normalizeWorkPermitFormValues(items: FormSchemaItem[], values: Record<string, unknown>): Record<string, unknown> {
  const result = { ...values };
  for (const item of items) {
    const key = String(item.id ?? item.name ?? "");
    if (!key) continue;
    const value = values[key];
    const children = item.props?.items;
    if ((item.name === "WorkPermitRiskCheckItems" || item.name === "WorkPermitAcceptanceItems") && Array.isArray(value)) {
      result[key] = effectiveWorkPermitItems(value as WorkPermitItem[]);
    } else if (item.name === "GroupList" && Array.isArray(value) && Array.isArray(children)) {
      result[key] = value.map((row) =>
        row && typeof row === "object" && !Array.isArray(row)
          ? normalizeWorkPermitFormValues(children as FormSchemaItem[], row as Record<string, unknown>)
          : row,
      );
    }
  }
  return result;
}

export function mergeWorkPermitItems(remote: WorkPermitItem[], selected: WorkPermitItem[]): WorkPermitItem[] {
  const previous = new Map(selected.filter((item) => !item.custom).map((item) => [workPermitItemKey(item), item]));
  return [
    ...remote.map((item) => ({
      ...item,
      ...previous.get(workPermitItemKey(item)),
      attachments: previous.get(workPermitItemKey(item))?.attachments ?? item.attachments ?? [],
    })),
    ...selected.filter((item) => item.custom),
  ];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export type WorkPermitRecognition =
  | { status: "FAILED" | "UNRECOGNIZED"; message: string }
  | { status: "SUCCESS"; result: "NORMAL" | "ABNORMAL"; description: string };

export function parseWorkPermitRecognition(response: unknown): WorkPermitRecognition {
  const outer = record(response);
  const data = record(outer.data ?? outer.result ?? outer);
  if (data.callResult === "FAILED") {
    return { status: "FAILED", message: String(data.failureReason ?? "请手动确认") };
  }
  const hazards = Array.isArray(data.hazards) ? data.hazards : [];
  if (!hazards.length && !data.confirmResult) {
    return { status: "UNRECOGNIZED", message: String(data.failureReason ?? data.description ?? "未识别到明确结果，请手动确认") };
  }
  const first = record(hazards[0]);
  return {
    status: "SUCCESS",
    result: data.confirmResult === "NORMAL" ? "NORMAL" : "ABNORMAL",
    description: String(data.description ?? first.disposalSuggestion ?? first.hazardTypeName ?? "AI识别异常，请现场复核"),
  };
}

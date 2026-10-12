import type { RiskType } from "@g2-contract/risk-management";

export type RiskTypeForm = {
  name: string;
  remarks: string;
  itemCode: string;
  superiorsId: string;
  level: number;
};

/** 与旧 risk-type 页一致：字典级联分类固定 itemCode。 */
export function emptyRiskTypeForm(): RiskTypeForm {
  return {
    name: "",
    remarks: "",
    itemCode: "risk-source-type",
    superiorsId: "",
    level: 1,
  };
}

export function buildCreateRiskTypePayload(form: RiskTypeForm): RiskTypeForm {
  return {
    name: form.name.trim(),
    remarks: form.remarks,
    itemCode: form.itemCode || "risk-source-type",
    superiorsId: form.superiorsId,
    level: form.level,
  };
}

export function buildUpdateRiskTypePayload(editing: RiskType, form: RiskTypeForm): RiskType & RiskTypeForm {
  return {
    ...editing,
    name: form.name.trim(),
    remarks: form.remarks,
    itemCode: form.itemCode || String(editing.itemCode ?? "risk-source-type"),
    superiorsId: form.superiorsId,
    level: form.level,
  };
}

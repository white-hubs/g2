import type { RiskPageQuery } from "@g2-contract/risk-graded-control";

import { exportControlMeasures, exportMeasureExecutions, exportNoticeCards, exportUnitInventory, exportUnits } from "@/api/server";

export async function exportRiskXlsx(
  resource: "units" | "unit-inventory" | "control-measures" | "measure-executions" | "notice-cards",
  params?: RiskPageQuery,
): Promise<Blob> {
  const exporters = {
    units: exportUnits,
    "unit-inventory": exportUnitInventory,
    "control-measures": exportControlMeasures,
    "measure-executions": exportMeasureExecutions,
    "notice-cards": exportNoticeCards,
  } as const;
  const response = await exporters[resource]({ ...params });
  const data = response && typeof response === "object" && "data" in response ? (response as { data?: unknown }).data : response;
  if (data instanceof Blob) return data;
  if (response instanceof Blob) return response;
  throw new Error("导出服务未返回文件");
}

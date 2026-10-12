export type OperationType = "controlButton" | "busPanel" | "multiLinePanel";
export type OperationResult = "success" | "failed";
export interface FireOperationRecord {
  id: string;
  operationTime: string;
  hostId: string;
  hostName: string;
  operator: string;
  operationType: OperationType;
  content: string;
  result: OperationResult;
  failureReason?: string;
}
export interface OperationRecordFilters {
  hostId: string;
  operationType: OperationType | "";
  result: OperationResult | "";
  operator: string;
  period: string[];
}
export const OPERATION_TYPE_LABEL: Record<OperationType, string> = {
  controlButton: "控制按钮",
  busPanel: "总线盘",
  multiLinePanel: "多线盘",
};
export const OPERATION_TYPE_COLOR: Record<OperationType, string> = { controlButton: "blue", busPanel: "geekblue", multiLinePanel: "cyan" };
export const OPERATION_RESULT_LABEL: Record<OperationResult, string> = { success: "成功", failed: "失败" };
export const OPERATION_TYPE_OPTIONS = [
  { label: "全部操作类型", value: "" },
  ...Object.entries(OPERATION_TYPE_LABEL).map(([value, label]) => ({ label, value })),
];
export const OPERATION_RESULT_OPTIONS = [
  { label: "全部结果", value: "" },
  { label: "成功", value: "success" },
  { label: "失败", value: "failed" },
];
export const DEFAULT_OPERATION_RECORD_FILTERS: OperationRecordFilters = {
  hostId: "",
  operationType: "",
  result: "",
  operator: "",
  period: [],
};

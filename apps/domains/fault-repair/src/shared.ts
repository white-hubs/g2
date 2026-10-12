/**
 * 供投诉建议等薄宿主 Domain 复用：安装上下文 + 共用页面。
 * 不走 pageLibrary remote，仅 workspace 依赖打包进各自 Domain。
 */
export { installFaultRepairContext, getFaultMaintainRuntime } from "./domain-context";
export { resolveFaultMaintainRuntime, type FaultMaintainRuntime } from "./runtime";
export { FaultRepairList, FaultRepairRecord } from "./views/flow-list";
export { FaultTypeList } from "./views/type";
export { WorkOrderStatistics, PersonnelStatistics } from "./views/statistics";
export { hostStreamEnginePage } from "./mount-stream-page";

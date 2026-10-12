import { getContext } from "./domain-context";

/** 只消费 Shell 已预检的公共运行时，不在领域产物中打包组件实现。 */
export function loadPcUi(): Promise<typeof import("@g2-platform/pc-ui")> {
  return getContext().loadRuntimeCommon("pcUi", "index");
}
export function loadPcChart(): Promise<typeof import("@g2-platform/pc-chart")> {
  return getContext().loadRuntimeCommon("pcChart", "chart");
}
export function loadPcMap(): Promise<typeof import("@g2-platform/pc-map")> {
  return getContext().loadRuntimeCommon("pcMap", "index");
}

/** 路线表单弹窗共用的最小 state 形状（配置页与指挥页均满足） */
export interface EvacuationModalBindings {
  routeModalOpen: { value: boolean };
  routeModalTitle: { value: string };
  routeForm: { name: string; capacity: number; priority: "高" | "中" | "低" };
  routeSaving?: { value: boolean };
  closeRouteModal: () => void;
  confirmRouteModal: () => void | Promise<void>;
}

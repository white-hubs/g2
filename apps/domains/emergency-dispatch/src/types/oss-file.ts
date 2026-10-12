/**
 * 上传文件结构：对齐旧仓 OSSFile，平面图叠加依赖 id / path / endpointPath。
 */
export type OSSFile = {
  id: string | number;
  name?: string;
  path?: string;
  url?: string;
  suffix?: string;
  size?: number;
  endpointPath?: string;
  [key: string]: unknown;
};

/** 对齐旧仓 GLOBAL_SCENE_CODE.emergencyDispatch / 平面图上传场景 */
export const GLOBAL_SCENE_CODE = {
  emergencyDispatch: "EMERGENCY_DISPATCH",
  emergencyFile: "EMERGENCY_DISPATCH",
  floorPlan: "EMERGENCY_DISPATCH::FLOOR_PLAN",
} as const;

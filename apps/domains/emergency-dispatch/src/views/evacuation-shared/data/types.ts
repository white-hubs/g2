import type { OSSFile } from "@/types/oss-file";

export type RoutePriority = "高" | "中" | "低";

export type RouteTrafficStatus = "畅通" | "拥挤" | "阻断" | "已禁用";

/** 路线节点坐标（GCJ-02 经纬度，与高德地图一致） */
export interface RoutePoint {
  lng: number;
  lat: number;
}

export type FloorPlanImage = OSSFile & {
  endpointPath?: string;
  /** 宽 / 高，用于地图叠加时保持图片原始比例 */
  aspectRatio?: number;
};

/** 平面图在地图上的叠加变换（每张图独立保存） */
export interface PlanTransform {
  center: RoutePoint;
  scale: number;
  rotation: number;
}

export const DEFAULT_PLAN_TRANSFORM = (center: RoutePoint): PlanTransform => ({
  center: { ...center },
  scale: 1,
  rotation: 0,
});

export interface CameraDevice {
  id: string;
  name: string;
  category: string;
  area: string;
}

/** 实时画面列表项（来自区域路线绑定设备并集） */
export interface FeedCamera {
  id: string;
  name: string;
  area: string;
  online: boolean;
}

export interface EvacuationRoute {
  id: string;
  name: string;
  capacity: number;
  priority: RoutePriority;
  points: RoutePoint[];
  color: string;
  boundCameras: CameraDevice[];
  enabled: boolean;
}

export interface CommandRoute extends EvacuationRoute {
  active: boolean;
  trafficStatus: RouteTrafficStatus;
  capacityPerMin: number;
  isSystem?: boolean;
}

export type EmergencyEventStatus = "processing" | "pending" | "resolved";

export type EmergencyEventLevelKey = "major" | "serious" | "moderate" | "normal";

export interface EmergencyEvent {
  id: string;
  type: string;
  icon: string;
  level: string;
  levelKey: EmergencyEventLevelKey;
  location: string;
  status: EmergencyEventStatus;
  statusLabel: string;
  time: string;
  firePoint: RoutePoint;
  areaId?: string | null;
  areaName?: string | null;
}

export interface LocationFloor {
  label: string;
  isFire?: boolean;
}

export interface LocationBuilding {
  name: string;
  fire?: boolean;
  children: LocationFloor[];
}

export interface AreaTreeItem {
  id: string;
  name: string;
  expanded: boolean;
  children: AreaTreeItem[];
}

/** @deprecated 使用 AreaTreeItem */
export type AreaGroup = AreaTreeItem;

/** 智慧巡检对象类型与无人机/机器狗配置转换，对齐旧仓 smart-inspect-common/types */

export type SmartInspectSpecialTargetCategory = "DRONE" | "ROBOT_DOG";
export type SmartInspectCommonTargetCategory =
  | "AREA"
  | "DEVICE"
  | "PROPERTY"
  | "STALL"
  | "SITE_POINT"
  | "RISK_SOURCE"
  | "SMALL_ENGINEERING";
export type SmartInspectTargetCategory = SmartInspectCommonTargetCategory | SmartInspectSpecialTargetCategory;

export interface SmartInspectStandardItem {
  id: string;
  name?: string;
  [key: string]: unknown;
}

export interface SmartInspectStandard {
  id: string;
  name?: string;
  standardItems: SmartInspectStandardItem[];
  [key: string]: unknown;
}

export interface SmartInspectTargetTypeOption {
  label: string;
  value: SmartInspectTargetCategory;
  icon: string;
  desc: string;
  tone?: "default" | "drone" | "robotDog";
}

export interface SmartInspectPoint {
  id: string;
  waypointId?: string;
  name: string;
  code: string;
  address: string;
  order: number;
  actualLng?: string;
  actualLat?: string;
  actualHeight?: string;
  photoEnabled?: boolean;
  recordEnabled?: boolean;
  standardDTOList: SmartInspectStandard[];
  status?: string;
  result?: string;
  flyStatus?: string;
  inspectionStatus?: string;
  flyFinishAt?: string;
  inspectionTime?: string;
  fileVOS?: Array<Record<string, unknown>>;
}

export interface SmartInspectDeviceRouteConfigValue {
  method: SmartInspectSpecialTargetCategory;
  deviceId: string;
  deviceName: string;
  routeId: string;
  routeName: string;
  points: SmartInspectPoint[];
}

export interface SmartInspectDronePlanWaypointContent {
  waypointId?: string | number;
  waypointName?: string;
  seqNo?: number;
  actualLng?: string | number;
  actualLat?: string | number;
  actualHeight?: string | number;
  photoEnabled?: boolean;
  recordEnabled?: boolean;
  standardDTOList?: SmartInspectStandard[];
}

export interface SmartInspectDronePlanConfig {
  routeId?: string | number;
  routeName?: string;
  deviceId?: string | number;
  deviceName?: string;
  waypointContents?: SmartInspectDronePlanWaypointContent[];
}

export interface SmartInspectDroneTaskSummary {
  droneTaskId?: string | number;
  routeId?: string | number;
  routeName?: string;
  deviceId?: string | number;
  deviceName?: string;
  waypointTotal?: number;
  flightProgressRate?: string | number;
  status?: string;
}

export interface SmartInspectDroneTaskWaypoint {
  id?: string | number;
  waypointId?: string | number;
  waypointName?: string;
  seqNo?: number;
  commandLng?: string | number;
  commandLat?: string | number;
  commandHeight?: string | number;
  photoEnabled?: boolean;
  recordEnabled?: boolean;
  photoStatus?: string;
  recordStatus?: string;
  flyStatus?: string;
  inspectionStatus?: string;
  status?: string;
  flyFinishAt?: string;
  inspectionTime?: string;
  fileVOS?: Array<Record<string, unknown>>;
  standardVOS?: SmartInspectStandard[];
}

export const smartInspectCommonTargetTypeOptions: SmartInspectTargetTypeOption[] = [
  { label: "区域", value: "AREA", icon: "🏢", desc: "园区物理分区单元，如楼层、地下室等" },
  { label: "设备", value: "DEVICE", icon: "🔧", desc: "需定期检查的硬件设施，如闸机、烟感等" },
  { label: "资产", value: "PROPERTY", icon: "📦", desc: "公司固定资产，如消防车辆、发电机等" },
  { label: "档位", value: "STALL", icon: "📊", desc: "按防护等级划分的管理单元" },
  { label: "现场点", value: "SITE_POINT", icon: "📍", desc: "需人工到达检查的位置，如配电室等" },
  { label: "风险源", value: "RISK_SOURCE", icon: "⚠️", desc: "存在安全隐患的重点监控对象" },
  { label: "小散工程", value: "SMALL_ENGINEERING", icon: "🏗️", desc: "在建或近期完工的小型施工项目" },
];

export const smartInspectSpecialTargetTypeOptions: SmartInspectTargetTypeOption[] = [
  { label: "无人机", value: "DRONE", icon: "🛸", desc: "按预设航线自动执行的空中巡检", tone: "drone" },
  { label: "机器狗", value: "ROBOT_DOG", icon: "🐕", desc: "按预设地面路线自动执行的地面巡检", tone: "robotDog" },
];

export const smartInspectTargetTypeOptions: SmartInspectTargetTypeOption[] = [
  ...smartInspectCommonTargetTypeOptions,
  ...smartInspectSpecialTargetTypeOptions,
];

export const smartInspectTargetCategoryOptions: { label: string; value: "" | SmartInspectTargetCategory }[] = [
  { label: "全部", value: "" },
  ...smartInspectTargetTypeOptions.map((item) => ({ label: item.label, value: item.value })),
];

export const smartInspectTargetTypeLabelMap = new Map<SmartInspectTargetCategory, string>(
  smartInspectTargetTypeOptions.map((item) => [item.value, item.label]),
);

export const isSmartInspectTargetCategory = (value: unknown): value is SmartInspectTargetCategory => {
  return smartInspectTargetTypeOptions.some((item) => item.value === value);
};

const appendSmartTargetCategory = (result: SmartInspectTargetCategory[], value: unknown): void => {
  if (isSmartInspectTargetCategory(value)) {
    result.push(value);
  }
};

const appendSmartTargetCategoriesFromTypeTargets = (result: SmartInspectTargetCategory[], value: unknown): void => {
  if (!Array.isArray(value)) return;
  value.flat(Number.POSITIVE_INFINITY).forEach((item) => {
    if (item && typeof item === "object") {
      appendSmartTargetCategory(result, (item as Record<string, unknown>).targetCategory);
    }
  });
};

export const getSmartTargetCategories = (record?: Record<string, unknown>): SmartInspectTargetCategory[] => {
  const result: SmartInspectTargetCategory[] = [];
  const rawCategories = record?.targetCategories;
  if (Array.isArray(rawCategories)) {
    rawCategories.forEach((item) => appendSmartTargetCategory(result, item));
  }
  String(record?.targetCategory || "")
    .split(",")
    .map((item) => item.trim())
    .forEach((item) => appendSmartTargetCategory(result, item));
  appendSmartTargetCategoriesFromTypeTargets(result, record?.typeTargets);
  const inspectionMode = String(record?.inspectionMode || "");
  if (inspectionMode === "DRONE" || inspectionMode === "HYBRID" || record?.droneConfig || record?.droneInspection) {
    result.push("DRONE");
  }
  if (inspectionMode === "ROBOT_DOG" || inspectionMode === "HYBRID_ROBOT_DOG" || record?.robotDogConfig || record?.robotDogInspection) {
    result.push("ROBOT_DOG");
  }
  return [...new Set(result)];
};

export const mergeSmartTargetCategories = (
  ...groups: Array<Array<SmartInspectTargetCategory | string | undefined>>
): SmartInspectTargetCategory[] => {
  return [...new Set(groups.flat().filter(isSmartInspectTargetCategory))];
};

export const hasCommonTargetCategory = (categories: SmartInspectTargetCategory[]): boolean => {
  return categories.some((item) => item !== "DRONE" && item !== "ROBOT_DOG");
};

export const getSmartTargetCategoryLabel = (value?: string): string => {
  if (isSmartInspectTargetCategory(value)) return smartInspectTargetTypeLabelMap.get(value) || "--";
  return value || "--";
};

export const getInspectionModeByCategories = (
  categories: SmartInspectTargetCategory[],
): "MANUAL" | "DRONE" | "HYBRID" | "ROBOT_DOG" | "HYBRID_ROBOT_DOG" => {
  const hasDrone = categories.includes("DRONE");
  const hasRobotDog = categories.includes("ROBOT_DOG");
  if (!hasDrone && !hasRobotDog) return "MANUAL";
  const hasCommon = categories.some((item) => item !== "DRONE" && item !== "ROBOT_DOG");
  if (hasRobotDog) return hasCommon ? "HYBRID_ROBOT_DOG" : "ROBOT_DOG";
  return hasCommon ? "HYBRID" : "DRONE";
};

const toStringId = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  return String(value);
};

const toPointAddress = (lng?: unknown, lat?: unknown, height?: unknown): string => {
  const values = [lng, lat, height].filter((item) => item !== undefined && item !== null && item !== "");
  return values.length ? values.map(String).join(" / ") : "";
};

const cloneConfig = (config: SmartInspectDeviceRouteConfigValue): SmartInspectDeviceRouteConfigValue => ({
  ...config,
  points: config.points.map((item) => ({
    ...item,
    standardDTOList: (item.standardDTOList || []).map((standard) => ({
      ...standard,
      standardItems: [...(standard.standardItems || [])],
    })),
  })),
});

export const buildDroneInspectionConfigPayload = (config?: SmartInspectDeviceRouteConfigValue): Record<string, unknown> | undefined => {
  if (!config) return undefined;
  return {
    routeId: config.routeId,
    deviceId: config.deviceId || undefined,
    deviceName: config.deviceName || undefined,
    waypointContents: config.points.flatMap((point) => {
      return point.standardDTOList.flatMap((standard) => {
        return (standard.standardItems || []).map((item, itemIndex) => ({
          waypointId: point.waypointId || point.id,
          seqNo: point.order,
          standardId: standard.id,
          itemId: item.id,
          sortNo: itemIndex + 1,
        }));
      });
    }),
  };
};

export const createSmartInspectPointFromDronePlanContent = (content: SmartInspectDronePlanWaypointContent): SmartInspectPoint => {
  const waypointId = toStringId(content.waypointId);
  const seqNo = Number(content.seqNo || 0);
  return {
    id: waypointId,
    waypointId,
    name: String(content.waypointName || `航点${seqNo || ""}`),
    code: `WP-${seqNo || waypointId}`,
    address: toPointAddress(content.actualLng, content.actualLat, content.actualHeight),
    order: seqNo,
    actualLng: toStringId(content.actualLng),
    actualLat: toStringId(content.actualLat),
    actualHeight: toStringId(content.actualHeight),
    photoEnabled: Boolean(content.photoEnabled),
    recordEnabled: Boolean(content.recordEnabled),
    standardDTOList: content.standardDTOList || [],
  };
};

export const createDroneConfigFromPlanDetail = (
  config?: SmartInspectDronePlanConfig,
  method: SmartInspectSpecialTargetCategory = "DRONE",
): SmartInspectDeviceRouteConfigValue | undefined => {
  if (!config?.routeId) return undefined;
  return cloneConfig({
    method,
    deviceId: toStringId(config.deviceId),
    deviceName: String(config.deviceName || ""),
    routeId: toStringId(config.routeId),
    routeName: String(config.routeName || ""),
    points: (config.waypointContents || []).map(createSmartInspectPointFromDronePlanContent),
  });
};

export const createDroneConfigFromTaskDetail = (
  summary?: SmartInspectDroneTaskSummary,
  waypoints: SmartInspectDroneTaskWaypoint[] = [],
  method: SmartInspectSpecialTargetCategory = "DRONE",
): SmartInspectDeviceRouteConfigValue | undefined => {
  if (!summary?.routeId && !waypoints.length) return undefined;
  return cloneConfig({
    method,
    deviceId: toStringId(summary?.deviceId),
    deviceName: String(summary?.deviceName || ""),
    routeId: toStringId(summary?.routeId),
    routeName: String(summary?.routeName || ""),
    points: waypoints.map((waypoint) => {
      const waypointId = toStringId(waypoint.waypointId || waypoint.id);
      const seqNo = Number(waypoint.seqNo || 0);
      return {
        id: waypointId,
        waypointId,
        name: String(waypoint.waypointName || `航点${seqNo || ""}`),
        code: `WP-${seqNo || waypointId}`,
        address: toPointAddress(waypoint.commandLng, waypoint.commandLat, waypoint.commandHeight),
        order: seqNo,
        actualLng: toStringId(waypoint.commandLng),
        actualLat: toStringId(waypoint.commandLat),
        actualHeight: toStringId(waypoint.commandHeight),
        photoEnabled: waypoint.photoEnabled ?? String(waypoint.photoStatus || "") !== "SKIPPED",
        recordEnabled: waypoint.recordEnabled ?? String(waypoint.recordStatus || "") !== "SKIPPED",
        status: String(waypoint.status || ""),
        result: String(waypoint.inspectionStatus || ""),
        flyStatus: waypoint.flyStatus,
        inspectionStatus: waypoint.inspectionStatus,
        flyFinishAt: waypoint.flyFinishAt,
        inspectionTime: waypoint.inspectionTime,
        fileVOS: waypoint.fileVOS || [],
        standardDTOList: waypoint.standardVOS || [],
      };
    }),
  });
};

/** 对齐 cube `@ghcloud/cube-daily-inspection-service`：日常巡检 businessType 为空串。 */
export const InspectBusinessType = {
  DAILY_INSPECTION: "",
  SMALL_ENGINEERING: "SMALL_ENGINEERING",
} as const;

export type InspectBusinessTypeValue = (typeof InspectBusinessType)[keyof typeof InspectBusinessType];

export const ObjectType = {
  AREA: "AREA",
  DEVICE: "DEVICE",
  PROPERTY: "PROPERTY",
  STALL: "STALL",
  SITE_POINT: "SITE_POINT",
  PATROL_POINT: "PATROL_POINT",
  RISK_SOURCE: "RISK_SOURCE",
  SMALL_ENGINEERING: "SMALL_ENGINEERING",
} as const;

export type ObjectTypeValue = (typeof ObjectType)[keyof typeof ObjectType];

export const OBJECT_TYPE_LABELS: Record<ObjectTypeValue, string> = {
  [ObjectType.AREA]: "区域",
  [ObjectType.DEVICE]: "设备",
  [ObjectType.PROPERTY]: "资产",
  [ObjectType.STALL]: "档位",
  [ObjectType.SITE_POINT]: "现场点",
  [ObjectType.PATROL_POINT]: "巡更点",
  [ObjectType.RISK_SOURCE]: "风险源",
  [ObjectType.SMALL_ENGINEERING]: "小散工程",
};

export const targetCategoryOptions = [
  { label: "设备", value: "DEVICE" },
  { label: "档位", value: "STALL" },
  { label: "资产", value: "PROPERTY" },
  { label: "现场点", value: "SITE_POINT" },
  { label: "巡更点", value: "PATROL_POINT" },
  { label: "风险源", value: "RISK_SOURCE" },
  { label: "小散工程", value: "SMALL_ENGINEERING" },
  { label: "区域", value: "AREA" },
];

/** 档案/记录筛选：结果来源 */
export const resultSourceOptions = [
  { label: "AI识别", value: "AI" },
  { label: "人工确认", value: "MANUAL" },
];

/** 智能巡检列表：对象类型 */
export const smartTargetCategoryOptions = [
  { label: "设备", value: "DEVICE" },
  { label: "档位", value: "STALL" },
  { label: "资产", value: "PROPERTY" },
  { label: "现场点", value: "SITE_POINT" },
  { label: "巡更点", value: "PATROL_POINT" },
  { label: "风险源", value: "RISK_SOURCE" },
  { label: "小散工程", value: "SMALL_ENGINEERING" },
  { label: "区域", value: "AREA" },
  { label: "无人机", value: "DRONE" },
  { label: "机器狗", value: "ROBOT_DOG" },
];

export const taskTimeoutOptions = [
  { label: "已超时", value: "TIMEOUT" },
  { label: "未超时", value: "NO_TIMEOUT" },
];

export const recordTypeOptions = [
  { label: "全部记录", value: "0" },
  { label: "日常记录", value: "1" },
  { label: "临时记录", value: "2" },
];

export const receiveTypeOptions = [
  { label: "部门", value: "2" },
  { label: "人员", value: "1" },
];

export const executeCycleOptions = [
  { label: "每日", value: "EVERY_DAY" },
  { label: "每周", value: "EVERY_WEEK" },
  { label: "每月", value: "EVERY_MONTH" },
];

export const weekCycleOptions = (() => {
  const options = Array.from({ length: 7 }, (_, k) => ({
    label: `周${["日", "一", "二", "三", "四", "五", "六"][k]}`,
    value: String(k + 1),
  }));
  const first = options.shift();
  if (first) options.push(first);
  return options;
})();

export const monthCycleOptions = Array.from({ length: 30 }, (_, k) => ({
  label: `${k + 1}号`,
  value: String(k + 1),
}));

export const cycleOptions = [
  { label: "立即", value: false },
  { label: "循环", value: true },
];

export const OBJECT_REF_KIND: Record<
  ObjectTypeValue,
  "device" | "stall" | "scene-point" | "property-detailed" | "risk-source" | "project-schedule" | "area" | "patrol-point"
> = {
  [ObjectType.AREA]: "area",
  [ObjectType.DEVICE]: "device",
  [ObjectType.PROPERTY]: "property-detailed",
  [ObjectType.STALL]: "stall",
  [ObjectType.SITE_POINT]: "scene-point",
  [ObjectType.PATROL_POINT]: "patrol-point",
  [ObjectType.RISK_SOURCE]: "risk-source",
  [ObjectType.SMALL_ENGINEERING]: "project-schedule",
};

/** 详情页/列表展示用（含智能巡检扩展类型） */
export const TARGET_CATEGORY_MAP: Record<string, string> = {
  ...OBJECT_TYPE_LABELS,
  DRONE: "无人机",
  ROBOT_DOG: "机器狗",
};

export const TARGET_CATEGORY_OPTIONS = Object.entries(TARGET_CATEGORY_MAP).map(([value, label]) => ({ label, value }));

export const PLAN_STATUS_MAP: Record<string, string> = {
  EXECUTING: "执行中",
  OVER: "已结束",
  STOP: "已停用",
};

export const TASK_STATUS_MAP: Record<string, string> = {
  ACCEPT: "待接收",
  EXECUTING: "待巡检",
  STOP: "已终止",
  OVER: "已巡检",
  WAIT_REPAIR: "待修复",
  REPAIRED: "已修复",
};

export const OBJECT_STATUS_MAP: Record<string, string> = {
  WAIT: "待巡检",
  FINISH: "已巡检",
  WAIT_REPAIR: "待修复",
  REPAIRED: "已修复",
  OVER: "已完成",
  STOP: "已终止",
};

export const OBJECT_STATUS_COLOR: Record<string, string> = {
  WAIT: "#1d66ff",
  FINISH: "#6ab539",
  WAIT_REPAIR: "#ffaa26",
  REPAIRED: "#6ab539",
  OVER: "#6ab539",
  STOP: "#969799",
};

export const RESULT_OPTIONS = [
  { label: "正常", value: "NORMAL" },
  { label: "异常", value: "ABNORMAL" },
];

export const LEVEL_OPTIONS = [
  { label: "普通", value: "NORMAL" },
  { label: "紧急", value: "GENERAL" },
];

export const INSPECTION_MODE_OPTIONS = [
  { label: "无人机巡检", value: "DRONE" },
  { label: "机器狗巡检", value: "ROBOT_DOG" },
  { label: "混合巡检", value: "HYBRID" },
];

export function formatDisplayTime(value: unknown): string {
  if (value === undefined || value === null || value === "") return "--";
  const normalized = typeof value === "string" && /^\d{13}$/.test(value) ? Number(value) : value;
  const date = new Date(normalized as string | number | Date);
  if (Number.isNaN(date.getTime())) return "--";
  const pad = (part: number): string => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatLimitTimeJson(value: unknown): string {
  if (!value) return "--";
  try {
    const parsed = JSON.parse(String(value)) as { day?: number; hour?: number; minute?: number };
    const parts = [
      parsed.day ? `${parsed.day}天` : "",
      parsed.hour ? `${parsed.hour}小时` : "",
      parsed.minute ? `${parsed.minute}分钟` : "",
    ].filter(Boolean);
    return parts.join("") || "--";
  } catch {
    return String(value);
  }
}

export function toIdList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string")
    return value
      ? value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  return [];
}

export function joinIds(value: unknown): string {
  return toIdList(value).join(",");
}

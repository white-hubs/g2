export enum ClassesType {
  /** 行政班 */
  ADMINISTRATION_SHIFT = "ADMINISTRATION_SHIFT",
  /** 早班 */
  EARLY = "EARLY",
  /** 中班班 */
  MIDDLE_SHIFT = "MIDDLE_SHIFT",
  /** 晚班 */
  NIGHT_SHIFT = "NIGHT_SHIFT",
}

export const classesTypeOptions = [
  { label: "早班", value: "EARLY" },
  { label: "中班", value: "MIDDLE_SHIFT" },
  { label: "夜班", value: "NIGHT_SHIFT" },
  { label: "行政班", value: "ADMINISTRATION_SHIFT" },
];

/** 班次颜色 */
export const classesColor = [
  { color: "cyan", value: ClassesType.EARLY },
  { color: "blue", value: ClassesType.MIDDLE_SHIFT },
  { color: "purple", value: ClassesType.NIGHT_SHIFT },
  { color: "pink", value: ClassesType.ADMINISTRATION_SHIFT },
];

/** 打卡状态 */
export enum ClockInStatus {
  /** 正常 */
  NORMAL = "NORMAL",
  /** 休息 */
  REST = "REST",
  /** 旷工 */
  NEGLECT_WORK = "NEGLECT_WORK",
  /** 异常 */
  ABNORMAL_WORK = "ABNORMAL_WORK",
  /** 未打卡 */
  NOT_CHECKED = "NOT_CHECKED",
  /** 早退 */
  EARLY_CHECKED = "EARLY_CHECKED",
  /** 迟到 */
  LATE_CHECKED = "LATE_CHECKED",
  /** 缺卡 */
  LACK_CHECKED = "LACK_CHECKED",
}

/** 打卡状态 */
export const ClockInStatusOptions = [
  { label: "正常", value: ClockInStatus.NORMAL },
  { label: "休息", value: ClockInStatus.REST },
  { label: "旷工", value: ClockInStatus.NEGLECT_WORK },
  { label: "异常", value: ClockInStatus.ABNORMAL_WORK },
  { label: "未打卡", value: ClockInStatus.NOT_CHECKED },
  { label: "早退", value: ClockInStatus.EARLY_CHECKED },
  { label: "迟到", value: ClockInStatus.LATE_CHECKED },
  { label: "缺卡", value: ClockInStatus.LACK_CHECKED },
];

/** 打卡状态颜色 */
export const ClockInStatusColor = [
  { color: "green", value: ClockInStatus.NORMAL },
  { color: "green", value: ClockInStatus.REST },
  { color: "red", value: ClockInStatus.NEGLECT_WORK },
  { color: "red", value: ClockInStatus.ABNORMAL_WORK },
  { color: "orange", value: ClockInStatus.NOT_CHECKED },
  { color: "pink", value: ClockInStatus.EARLY_CHECKED },
  { label: "pink", value: ClockInStatus.LATE_CHECKED },
  { color: "pink", value: ClockInStatus.LACK_CHECKED },
];
export const DayInStatusColor = [
  { color: "#1CC59B", value: ClockInStatus.NORMAL },
  { color: "#000000", value: ClockInStatus.REST },
  { color: "red", value: ClockInStatus.NEGLECT_WORK },
  { color: "red", value: ClockInStatus.ABNORMAL_WORK },
  { color: "orange", value: ClockInStatus.NOT_CHECKED },
  { color: "#FFA318", value: ClockInStatus.EARLY_CHECKED },
  { label: "#FFA318", value: ClockInStatus.LATE_CHECKED },
  { color: "#FFA318", value: ClockInStatus.LACK_CHECKED },
];

/** 打卡班次状态 */
export enum ClockInClassesStatus {
  /** 无数据 */
  NO_CLOCK = "NO_CLOCK",
  /** 旷工 */
  NEGLECT_WORK = "NEGLECT_WORK",
  /** 异常 */
  ABNORMAL_WORK = "ABNORMAL_WORK",
  /** 休息 */
  REST = "REST",
  /** 正常 */
  NORMAL = "NORMAL",
}

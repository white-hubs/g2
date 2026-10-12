export enum DeviceAuthScopeType {
  DEVICE_AREA = "DEVICE_AREA",
  DEVICE_GROUP = "DEVICE_GROUP",
  DEVICE = "DEVICE",
}
export enum DeviceAuthGrantTargetType {
  DEPARTMENT = "DEPARTMENT",
  ROLE = "ROLE",
  USER = "USER",
}

export enum CameraAiInspectionExecutionMode {
  ONCE = "ONCE",
  CYCLE = "CYCLE",
}

export enum CameraAiInspectionCycleType {
  EVERY_DAY = "EVERY_DAY",
  EVERY_WEEK = "EVERY_WEEK",
  EVERY_MONTH = "EVERY_MONTH",
}

export enum CameraAiInspectionExecutionType {
  SCHEDULE = "SCHEDULE",
  IMMEDIATE = "IMMEDIATE",
  MANUAL = "MANUAL",
}

export enum CameraAiInspectionActionType {
  ALARM = "ALARM",
  WORK_ORDER = "WORK_ORDER",
}

export enum CameraAiInspectionTaskStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  PARTIAL_FAILED = "PARTIAL_FAILED",
  FAILED = "FAILED",
  TIMEOUT = "TIMEOUT",
}

export enum CameraAiInspectionTaskCameraStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  QUALIFIED = "QUALIFIED",
  ABNORMAL = "ABNORMAL",
  FAILED = "FAILED",
}

export enum CameraAiInspectionActionStatus {
  NONE = "NONE",
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  IGNORED = "IGNORED",
}

export type FireHostId = string | number;

export type RemoteControlTab = "ctrl" | "water" | "electric" | "attendance";

export interface FireHostOption {
  id: FireHostId;
  deviceName: string;
  deviceCode: string;
  areaName: string;
  brandName: string;
  online: boolean;
  fireCount: number;
  faultCount: number;
  controlPasswordRequired: boolean;
}

export interface MonitorFeed {
  id: string;
  hostId: FireHostId;
  name: string;
  code: string;
  description: string;
}

export type ControlDeviceStatus = "run" | "processing" | "stop" | "flt" | "unknown";
export type ControlDevicePanel = "bus" | "multi";

export interface ControlDevice {
  id: string;
  name: string;
  status: ControlDeviceStatus;
  statusText: string;
  type: string;
  panel: ControlDevicePanel;
  location: string;
  online: boolean;
  controlReady: boolean;
  commandPending?: boolean;
}

export interface FireEventViewModel {
  id: string;
  eventName: string;
  eventType: "alarm" | "info" | "fault";
  deviceInfo: string;
  pointName: string;
  time: string;
  location: string;
  posX?: number | string | undefined;
  posY?: number | string | undefined;
}

export interface OperationLogViewModel {
  id: string;
  time: string;
  operator: string;
  type: string;
  content: string;
  result: "processing" | "success" | "failed";
  resultName: string;
  resultMessage?: string;
}

export interface FloorMapPoint {
  id: string;
  code: string;
  locationName: string;
  eventType: string;
  pointName: string;
  posX?: number | string | undefined;
  posY?: number | string | undefined;
}

export interface FloorMapImageRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type ControlButtonStyle = "red" | "blue" | "gray";

export interface ControlAction {
  buttonId: FireHostId;
  label: string;
  methodCode: string;
  methodType: string;
  icon: string;
  enabled: boolean;
  style: ControlButtonStyle;
  danger?: boolean;
  inputParams?: Record<string, unknown>;
}

export interface MonitorPoint {
  id: string;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
}

export interface MonitorMetricDevice {
  id: string;
  relationId?: string;
  deviceId?: string;
  name: string;
  icon: string;
  category: string;
  updatedAt: string;
  selectedPointId: string;
  points: MonitorPoint[];
}

export interface DeviceCandidate {
  id: string;
  code: string;
  name: string;
  category: string;
  model: string;
  area: string;
}

export type AttendanceType = string;
export type AttendanceStatus = string;

export interface AttendanceRecord {
  id: string;
  type: AttendanceType;
  level: "一级" | "二级" | "三级";
  area: string;
  location: string;
  time: string;
  deadline: string;
  timeout: "正常" | "超时";
  status: AttendanceStatus;
  handler: string;
  notifier: string;
  rule: string;
  alarmValue: string;
  deviceName: string;
}

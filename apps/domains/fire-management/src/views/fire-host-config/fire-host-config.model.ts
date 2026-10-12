import type { FireHostRecord } from "@g2-contract/fire-management";

export type { DeviceSelectRecord as DeviceSelectionRecord } from "@/components/device-select-modal";

export interface FireHostStatistics {
  hostCount: number;
  pointCount: number;
  todayAlarmCount: number;
  todayFaultCount: number;
}

export interface HostSearchParams extends Record<string, unknown> {
  pageNumber: number;
  pageSize: number;
  total: number;
  keyword: string;
  brandName: string;
}

export interface HostFormModalExpose {
  openModal: () => void;
}

export interface ControlPasswordModalExpose {
  openModal: (record: FireHostRecord) => void;
}

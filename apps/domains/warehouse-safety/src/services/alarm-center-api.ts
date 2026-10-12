import type { WarehouseSafetyDeviceOption, WarehouseSafetyEvent } from "@g2-contract/warehouse-safety";

import { getAlarmCenterClient } from "@/domain-context";
import { warehouseSafetyApi } from "@/services/warehouse-safety-api";

export type WarehouseAlarmRecord = WarehouseSafetyEvent & {
  alarmEvent?: string;
  alarmTargetCode?: string;
  alarmTypeName?: string;
  code?: string;
};

export type WarehouseAlarmDevice = WarehouseSafetyDeviceOption & {
  area?: { pathName?: string };
  productInfo?: { name?: string; productCategory?: { name?: string; code?: string } };
  status?: { onlineState?: boolean };
};

export type WarehouseAlarmMedia = {
  id?: string;
  type?: string;
  intranetFilePath?: string;
  extranetFilePath?: string;
  deviceName?: string;
  executeTime?: string;
};

function unwrapArray<T>(raw: unknown): T[] {
  const root = raw && typeof raw === "object" && "data" in raw ? (raw as { data: unknown }).data : raw;
  if (Array.isArray(root)) return root as T[];
  if (root && typeof root === "object") {
    const value = (root as Record<string, unknown>).records ?? (root as Record<string, unknown>).list;
    return Array.isArray(value) ? (value as T[]) : [];
  }
  return [];
}

export async function pageWarehouseAlarmRecords(params: {
  keyword?: string;
  period?: { begin: string; end: string };
  pageSize?: number;
}): Promise<{ records: WarehouseAlarmRecord[]; total: number }> {
  const result = await warehouseSafetyApi.pageEvents({
    pageNumber: 1,
    pageSize: params.pageSize ?? 20,
    keyword: params.keyword,
    startTime: params.period?.begin,
    endTime: params.period?.end,
  });
  return { records: result.records ?? [], total: result.total ?? 0 };
}

export async function listWarehouseAlarmDevices(alarmRecordId: string): Promise<WarehouseAlarmDevice[]> {
  return (await warehouseSafetyApi.listEventDevices(alarmRecordId)) as WarehouseAlarmDevice[];
}

export async function listWarehouseAlarmVideoFiles(businessKey: string): Promise<WarehouseAlarmMedia[]> {
  return unwrapArray<WarehouseAlarmMedia>(await (await getAlarmCenterClient()).getAlarmVideoEventFiles(businessKey));
}

import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { DictionaryClient } from "@g2-client/dictionary/client";
import type { FileClient } from "@g2-client/file/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { WarehouseSafetyClient } from "@g2-client/warehouse-safety/client";
import type { DomainContext } from "@g2-composition/contract";

let domainContext: DomainContext | null = null;
let warehouseClient: WarehouseSafetyClient | null = null;
let applicationCode = "WAREHOUSE_SAFETY";

export function installWarehouseSafetyContext(
  context: DomainContext,
  client: WarehouseSafetyClient,
  config?: Record<string, unknown>,
): void {
  domainContext = context;
  warehouseClient = client;
  applicationCode = typeof config?.applicationCode === "string" && config.applicationCode ? config.applicationCode : "WAREHOUSE_SAFETY";
}

export function getWarehouseSafetyContext(): DomainContext {
  if (!domainContext) throw new Error("warehouse-safety domain not installed");
  return domainContext;
}

export function getWarehouseSafetyClient(): WarehouseSafetyClient {
  if (!warehouseClient) throw new Error("warehouse-safety client not installed");
  return warehouseClient;
}

export function getWarehouseApplicationCode(): string {
  return applicationCode;
}

export const getAlarmCenterClient = (): Promise<AlarmCenterClient> =>
  getWarehouseSafetyContext().ensureClient<AlarmCenterClient>("alarmCenterClient");
export const getDeviceCenterClient = (): Promise<DeviceCenterClient> =>
  getWarehouseSafetyContext().ensureClient<DeviceCenterClient>("deviceCenterClient");
export const getDictionaryClient = (): Promise<DictionaryClient> =>
  getWarehouseSafetyContext().ensureClient<DictionaryClient>("dictionaryClient");
export const getFileClient = (): Promise<FileClient> => getWarehouseSafetyContext().ensureClient<FileClient>("fileClient");
export const getOuaaClient = (): Promise<OuaaClient> => getWarehouseSafetyContext().ensureClient<OuaaClient>("ouaaClient");

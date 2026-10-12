import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { DictionaryClient } from "@g2-client/dictionary/client";
import type { FileClient } from "@g2-client/file/client";
import type { FumigationOperationClient } from "@g2-client/fumigation-operation/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { DomainContext } from "@g2-composition/contract";

let domainContext: DomainContext | null = null;
let fumigationClient: FumigationOperationClient | null = null;
let applicationCode = "FUMIGATION_OPERATION";

export function installFumigationContext(
  context: DomainContext,
  client: FumigationOperationClient,
  config?: Record<string, unknown>,
): void {
  domainContext = context;
  fumigationClient = client;
  applicationCode = typeof config?.applicationCode === "string" && config.applicationCode ? config.applicationCode : "FUMIGATION_OPERATION";
}

export function getFumigationContext(): DomainContext {
  if (!domainContext) throw new Error("fumigation-operation domain not installed");
  return domainContext;
}

export function getFumigationClient(): FumigationOperationClient {
  if (!fumigationClient) throw new Error("fumigation-operation client not installed");
  return fumigationClient;
}

export function getFumigationApplicationCode(): string {
  return applicationCode;
}

export const getAlarmCenterClient = (): Promise<AlarmCenterClient> =>
  getFumigationContext().ensureClient<AlarmCenterClient>("alarmCenterClient");
export const getDeviceCenterClient = (): Promise<DeviceCenterClient> =>
  getFumigationContext().ensureClient<DeviceCenterClient>("deviceCenterClient");
export const getDictionaryClient = (): Promise<DictionaryClient> =>
  getFumigationContext().ensureClient<DictionaryClient>("dictionaryClient");
export const getFileClient = (): Promise<FileClient> => getFumigationContext().ensureClient<FileClient>("fileClient");
export const getOuaaClient = (): Promise<OuaaClient> => getFumigationContext().ensureClient<OuaaClient>("ouaaClient");

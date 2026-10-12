import type { ElectricalSafetyClient } from "@g2-client/electrical-safety/client";
import type { FileClient } from "@g2-client/file/client";
import type { MessageClient } from "@g2-client/message/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { DomainContext } from "@g2-composition/contract";

let domainContext: DomainContext | null = null;
let electricalSafetyClient: ElectricalSafetyClient | null = null;

export function installElectricalSafetyContext(context: DomainContext, client: ElectricalSafetyClient): void {
  domainContext = context;
  electricalSafetyClient = client;
}

export function getElectricalSafetyContext(): DomainContext {
  if (!domainContext) {
    throw new Error("electrical-safety domain not installed");
  }
  return domainContext;
}

export function getElectricalSafetyClient(): ElectricalSafetyClient {
  if (!electricalSafetyClient) {
    throw new Error("electrical-safety client not installed");
  }
  return electricalSafetyClient;
}

export function getFileClient(): Promise<FileClient> {
  return getElectricalSafetyContext().ensureClient<FileClient>("fileClient");
}

export function getMessageClient(): Promise<MessageClient> {
  return getElectricalSafetyContext().ensureClient<MessageClient>("messageClient");
}

export function getOuaaClient(): Promise<OuaaClient> {
  return getElectricalSafetyContext().ensureClient<OuaaClient>("ouaaClient");
}

export const getElectricalSafetyApplicationCode = () => "ELECTRICAL_SAFETY";
export const getAlarmCenterClient = () =>
  getElectricalSafetyContext().ensureClient<import("@g2-client/alarm-center/client").AlarmCenterClient>("alarmCenterClient");
export const getDeviceCenterClient = () =>
  getElectricalSafetyContext().ensureClient<import("@g2-client/device-center/client").DeviceCenterClient>("deviceCenterClient");
export const getDictionaryClient = () =>
  getElectricalSafetyContext().ensureClient<import("@g2-client/dictionary/client").DictionaryClient>("dictionaryClient");

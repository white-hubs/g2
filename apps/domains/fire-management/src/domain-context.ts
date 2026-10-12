import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { DictionaryClient } from "@g2-client/dictionary/client";
import type { FileClient } from "@g2-client/file/client";
import type { FireManagementClient } from "@g2-client/fire-management/client";
import type { MdataClient } from "@g2-client/mdata/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { DomainContext } from "@g2-composition/contract";
import type { GemMessageConfigClient } from "@g2-pages/generic-equipment-monitor";
import type { InjectionKey } from "vue";

export const DOMAIN_CONTEXT_KEY: InjectionKey<DomainContext> = Symbol("fire-management-domain-context");
export const APPLICATION_CODE_KEY: InjectionKey<string> = Symbol("fire-management-application-code");

let installContext: DomainContext | undefined;
let installedClient: FireManagementClient | undefined;
let installedApplicationCode = "FIRECONTROL";

export function installFireManagementContext(ctx: DomainContext, client: FireManagementClient, applicationCode?: string): void {
  installContext = ctx;
  installedClient = client;
  if (applicationCode) installedApplicationCode = applicationCode;
}

export function getApplicationCode(): string {
  return installedApplicationCode;
}

export function getFireManagementContext(): DomainContext {
  if (!installContext) {
    throw new Error("fire-management domain not installed");
  }
  return installContext;
}

export function getFireManagementClient(): FireManagementClient {
  if (!installedClient) {
    throw new Error("fire-management client not installed");
  }
  return installedClient;
}

export async function getDeviceCenterClient(): Promise<DeviceCenterClient> {
  return getFireManagementContext().ensureClient<DeviceCenterClient>("deviceCenterClient");
}

export async function getAlarmCenterClient(): Promise<AlarmCenterClient> {
  return getFireManagementContext().ensureClient<AlarmCenterClient>("alarmCenterClient");
}

export async function getDictionaryClient(): Promise<DictionaryClient> {
  return getFireManagementContext().ensureClient<DictionaryClient>("dictionaryClient");
}

export async function getFileClient(): Promise<FileClient> {
  return getFireManagementContext().ensureClient<FileClient>("fileClient");
}

export async function getMessageConfigClient(): Promise<GemMessageConfigClient> {
  return getFireManagementContext().ensureClient<GemMessageConfigClient>("emergencyManagementClient");
}

export async function getMdataClient(): Promise<MdataClient> {
  return getFireManagementContext().ensureClient<MdataClient>("mdataClient");
}

export async function getOuaaClient(): Promise<OuaaClient> {
  return getFireManagementContext().ensureClient<OuaaClient>("ouaaClient");
}

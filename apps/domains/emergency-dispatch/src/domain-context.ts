import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { DictionaryClient } from "@g2-client/dictionary/client";
import type { EmergencyDispatchClient } from "@g2-client/emergency-dispatch/client";
import type { MdataClient } from "@g2-client/mdata/client";
import type { DomainContext } from "@g2-composition/contract";
import type { InjectionKey } from "vue";

export const DOMAIN_CONTEXT_KEY: InjectionKey<DomainContext> = Symbol("emergency-dispatch-domain-context");
export const APPLICATION_CODE_KEY: InjectionKey<string> = Symbol("emergency-dispatch-application-code");

let installContext: DomainContext | undefined;
let installedClient: EmergencyDispatchClient | undefined;
let installedApplicationCode = "emergency-dispatch";

export function installEmergencyDispatchContext(ctx: DomainContext, client: EmergencyDispatchClient, applicationCode?: string): void {
  installContext = ctx;
  installedClient = client;
  if (applicationCode) {
    installedApplicationCode = applicationCode;
  }
}

export function getEmergencyDispatchContext(): DomainContext {
  if (!installContext) {
    throw new Error("emergency-dispatch domain not installed");
  }
  return installContext;
}

export function getEmergencyDispatchClient(): EmergencyDispatchClient {
  if (!installedClient) {
    throw new Error("emergency-dispatch client not installed");
  }
  return installedClient;
}

export function getApplicationCode(): string {
  return installedApplicationCode;
}

export async function getDeviceCenterClient(): Promise<DeviceCenterClient> {
  return getEmergencyDispatchContext().ensureClient<DeviceCenterClient>("deviceCenterClient");
}

export async function getMdataClient(): Promise<MdataClient> {
  return getEmergencyDispatchContext().ensureClient<MdataClient>("mdataClient");
}

export async function getDictionaryClient(): Promise<DictionaryClient> {
  return getEmergencyDispatchContext().ensureClient<DictionaryClient>("dictionaryClient");
}

export async function getAlarmCenterClient(): Promise<AlarmCenterClient> {
  return getEmergencyDispatchContext().ensureClient<AlarmCenterClient>("alarmCenterClient");
}

export interface EmergencyFileClient {
  uploadFile(payload: FormData): Promise<unknown>;
}

export async function getFileClient(): Promise<EmergencyFileClient> {
  return getEmergencyDispatchContext().ensureClient<EmergencyFileClient>("fileClient");
}

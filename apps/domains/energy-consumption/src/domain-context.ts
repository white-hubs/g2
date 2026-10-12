import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { EnergyConsumptionClient } from "@g2-client/energy-consumption/client";
import type { MdataClient } from "@g2-client/mdata/client";
import type { DomainContext } from "@g2-composition/contract";
import type { InjectionKey } from "vue";

export const DOMAIN_CONTEXT_KEY: InjectionKey<DomainContext> = Symbol("energy-consumption-domain-context");
export const APPLICATION_CODE_KEY: InjectionKey<string> = Symbol("energy-consumption-application-code");

let installContext: DomainContext | undefined;
let installedClient: EnergyConsumptionClient | undefined;
let installedApplicationCode = "energy-consumption";

export function installEnergyConsumptionContext(ctx: DomainContext, client: EnergyConsumptionClient, applicationCode?: string): void {
  installContext = ctx;
  installedClient = client;
  if (applicationCode) {
    installedApplicationCode = applicationCode;
  }
}

export function getEnergyConsumptionContext(): DomainContext {
  if (!installContext) {
    throw new Error("energy-consumption domain not installed");
  }
  return installContext;
}

export function getEnergyConsumptionClient(): EnergyConsumptionClient {
  if (!installedClient) {
    throw new Error("energy-consumption client not installed");
  }
  return installedClient;
}

export function getApplicationCode(): string {
  return installedApplicationCode;
}

export async function getDeviceCenterClient(): Promise<DeviceCenterClient> {
  return getEnergyConsumptionContext().ensureClient<DeviceCenterClient>("deviceCenterClient");
}

export async function getMdataClient(): Promise<MdataClient> {
  return getEnergyConsumptionContext().ensureClient<MdataClient>("mdataClient");
}

export interface EnergyOuaaClient {
  getDeptList?: (params?: unknown) => Promise<unknown>;
  pageUsers?: (params?: unknown) => Promise<unknown>;
}

export async function getOuaaClient(): Promise<EnergyOuaaClient> {
  return getEnergyConsumptionContext().ensureClient<EnergyOuaaClient>("ouaaClient");
}

export interface EnergyFileClient {
  uploadFile?: (payload: FormData) => Promise<unknown>;
}

export async function getFileClient(): Promise<EnergyFileClient> {
  return getEnergyConsumptionContext().ensureClient<EnergyFileClient>("fileClient");
}

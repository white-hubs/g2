import type { DomainContext } from "@g2-composition/contract";
import type { DailyInspectionClient } from "@g2-contract/daily-inspection";
import type { InjectionKey } from "vue";

export const DOMAIN_CONTEXT_KEY: InjectionKey<DomainContext> = Symbol("daily-inspection-domain-context");

let installedContext: DomainContext | undefined;
let installedClient: DailyInspectionClient | undefined;

export function installDailyInspectionContext(ctx: DomainContext, client: DailyInspectionClient): void {
  installedContext = ctx;
  installedClient = client;
}

export function getDailyInspectionContext(): DomainContext {
  if (!installedContext) throw new Error("daily-inspection domain not installed");
  return installedContext;
}

export function getDailyInspectionClient(): DailyInspectionClient {
  if (!installedClient) throw new Error("daily-inspection client not installed");
  return installedClient;
}

export interface DailyInspectionOuaaClient {
  listUsers(params: Record<string, unknown>): Promise<unknown>;
  getOrganizationTree(params?: Record<string, unknown>): Promise<unknown>;
  getRoles(): Promise<unknown>;
  listPositions(params?: Record<string, unknown>): Promise<unknown>;
}

export async function getOuaaClient(): Promise<DailyInspectionOuaaClient> {
  return getDailyInspectionContext().ensureClient<DailyInspectionOuaaClient>("ouaaClient");
}

export interface DailyInspectionMdataClient {
  getAreaTree(query?: Record<string, unknown>): Promise<unknown>;
}

export interface DailyInspectionDeviceCenterClient {
  getIotDeviceList(query?: Record<string, unknown>): Promise<unknown>;
}

export async function getMdataClient(): Promise<DailyInspectionMdataClient> {
  return getDailyInspectionContext().ensureClient<DailyInspectionMdataClient>("mdataClient");
}

export async function getDeviceCenterClient(): Promise<DailyInspectionDeviceCenterClient> {
  return getDailyInspectionContext().ensureClient<DailyInspectionDeviceCenterClient>("deviceCenterClient");
}

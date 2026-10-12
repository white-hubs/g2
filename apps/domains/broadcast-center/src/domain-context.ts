import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { DomainContext } from "@g2-composition/contract";
import type { BroadcastCenterClient } from "@g2-contract/broadcast-center";
import type { InjectionKey } from "vue";

/** 文件上传仅依赖 uploadFile，避免强耦合 file client 全量类型。 */
export interface BroadcastFileClient {
  uploadFile(payload: FormData): Promise<unknown>;
}

export const DOMAIN_CONTEXT_KEY: InjectionKey<DomainContext> = Symbol("broadcast-center-domain-context");

let installContext: DomainContext | undefined;
let installedClient: BroadcastCenterClient | undefined;
let installedApplicationCode = "BROADCASTCENTER";

export function installBroadcastCenterContext(ctx: DomainContext, client: BroadcastCenterClient, applicationCode?: string): void {
  installContext = ctx;
  installedClient = client;
  if (applicationCode) {
    installedApplicationCode = applicationCode;
  }
}

export function getBroadcastCenterContext(): DomainContext {
  if (!installContext) {
    throw new Error("broadcast-center domain not installed");
  }
  return installContext;
}

export function getBroadcastCenterClient(): BroadcastCenterClient {
  if (!installedClient) {
    throw new Error("broadcast-center client not installed");
  }
  return installedClient;
}

export function getApplicationCode(): string {
  return installedApplicationCode;
}

export async function getFileClient(): Promise<BroadcastFileClient> {
  return getBroadcastCenterContext().ensureClient<BroadcastFileClient>("fileClient");
}

export async function getDeviceCenterClient(): Promise<DeviceCenterClient> {
  return getBroadcastCenterContext().ensureClient<DeviceCenterClient>("deviceCenterClient");
}

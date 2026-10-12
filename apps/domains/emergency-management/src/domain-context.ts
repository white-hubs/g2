import type { DomainContext } from "@g2-composition/contract";
import type { EmergencyManagementClient } from "@g2-contract/emergency-management";
import type { InjectionKey } from "vue";

export const DOMAIN_CONTEXT_KEY: InjectionKey<DomainContext> = Symbol("emergency-management-domain-context");

let installContext: DomainContext | undefined;
let installedClient: EmergencyManagementClient | undefined;

export function installEmergencyManagementContext(ctx: DomainContext, client: EmergencyManagementClient): void {
  installContext = ctx;
  installedClient = client;
}

export function getEmergencyManagementContext(): DomainContext {
  if (!installContext) {
    throw new Error("emergency-management domain not installed");
  }
  return installContext;
}

export function getEmergencyManagementClient(): EmergencyManagementClient {
  if (!installedClient) {
    throw new Error("emergency-management client not installed");
  }
  return installedClient;
}

export interface EmergencyFileClient {
  uploadFile(payload: FormData): Promise<unknown>;
}

export async function getFileClient(): Promise<EmergencyFileClient> {
  return getEmergencyManagementContext().ensureClient<EmergencyFileClient>("fileClient");
}

import type { EmergencySuppliesClient } from "@g2-client/emergency-supplies/client";
import type { FileClient } from "@g2-client/file/client";
import type { MessageClient } from "@g2-client/message/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { DomainContext } from "@g2-composition/contract";

let domainContext: DomainContext | null = null;
let emergencySuppliesClient: EmergencySuppliesClient | null = null;
let emergencySuppliesPcUi: typeof import("@g2-platform/pc-ui") | null = null;

export function installEmergencySuppliesContext(context: DomainContext, client: EmergencySuppliesClient): void {
  domainContext = context;
  emergencySuppliesClient = client;
}

export function getEmergencySuppliesContext(): DomainContext {
  if (!domainContext) {
    throw new Error("emergency-supplies domain not installed");
  }
  return domainContext;
}

export function getEmergencySuppliesClient(): EmergencySuppliesClient {
  if (!emergencySuppliesClient) {
    throw new Error("emergency-supplies client not installed");
  }
  return emergencySuppliesClient;
}

export function installEmergencySuppliesPcUi(module: typeof import("@g2-platform/pc-ui")): void {
  emergencySuppliesPcUi = module;
}

export function getEmergencySuppliesPcUi(): typeof import("@g2-platform/pc-ui") {
  if (!emergencySuppliesPcUi) {
    throw new Error("emergency-supplies pcUi runtime has not been loaded");
  }
  return emergencySuppliesPcUi;
}

export function getFileClient(): Promise<FileClient> {
  return getEmergencySuppliesContext().ensureClient<FileClient>("fileClient");
}

export function getMessageClient(): Promise<MessageClient> {
  return getEmergencySuppliesContext().ensureClient<MessageClient>("messageClient");
}

export function getOuaaClient(): Promise<OuaaClient> {
  return getEmergencySuppliesContext().ensureClient<OuaaClient>("ouaaClient");
}

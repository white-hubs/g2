import type { FileClient } from "@g2-client/file/client";
import type { MessageClient } from "@g2-client/message/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { SafetyCreditClient } from "@g2-client/safety-credit/client";
import type { DomainContext } from "@g2-composition/contract";

let domainContext: DomainContext | null = null;
let safetyCreditClient: SafetyCreditClient | null = null;

export function installSafetyCreditContext(context: DomainContext, client: SafetyCreditClient): void {
  domainContext = context;
  safetyCreditClient = client;
}

export function getSafetyCreditContext(): DomainContext {
  if (!domainContext) {
    throw new Error("safety-credit domain not installed");
  }
  return domainContext;
}

export function getSafetyCreditClient(): SafetyCreditClient {
  if (!safetyCreditClient) {
    throw new Error("safety-credit client not installed");
  }
  return safetyCreditClient;
}

export function getFileClient(): Promise<FileClient> {
  return getSafetyCreditContext().ensureClient<FileClient>("fileClient");
}

export function getMessageClient(): Promise<MessageClient> {
  return getSafetyCreditContext().ensureClient<MessageClient>("messageClient");
}

export function getOuaaClient(): Promise<OuaaClient> {
  return getSafetyCreditContext().ensureClient<OuaaClient>("ouaaClient");
}

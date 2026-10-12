import type { ElectronicPatrolClient } from "@g2-client/electronic-patrol/client";
import type { DomainContext } from "@g2-composition/contract";
import type { MessageClient } from "@g2-contract/message";

let domainContext: DomainContext | null = null;
let patrolClient: ElectronicPatrolClient | null = null;
let messageClient: MessageClient | null = null;

export function installElectronicPatrolContext(context: DomainContext, client: ElectronicPatrolClient, messages: MessageClient): void {
  domainContext = context;
  patrolClient = client;
  messageClient = messages;
}

export function getElectronicPatrolContext(): DomainContext {
  if (!domainContext) {
    throw new Error("electronic-patrol domain not installed");
  }
  return domainContext;
}

export function getElectronicPatrolClient(): ElectronicPatrolClient {
  if (!patrolClient) {
    throw new Error("electronic-patrol client not installed");
  }
  return patrolClient;
}

export function getElectronicPatrolMessageClient(): MessageClient {
  if (!messageClient) {
    throw new Error("message client not installed for electronic-patrol");
  }
  return messageClient;
}

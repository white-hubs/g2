import type { FileClient } from "@g2-client/file/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { RiskGradedControlClient } from "@g2-client/risk-graded-control/client";
import type { DomainContext } from "@g2-composition/contract";
import type { InjectionKey } from "vue";

export const DOMAIN_CONTEXT_KEY: InjectionKey<DomainContext> = Symbol("risk-graded-control-domain-context");

let context: DomainContext | undefined;
let client: RiskGradedControlClient | undefined;

export function installRiskGradedControlContext(nextContext: DomainContext, nextClient: RiskGradedControlClient): void {
  context = nextContext;
  client = nextClient;
}

export function getRiskGradedControlContext(): DomainContext {
  if (!context) throw new Error("risk-graded-control domain not installed");
  return context;
}

export function getRiskGradedControlClient(): RiskGradedControlClient {
  if (!client) throw new Error("risk-graded-control domain not installed");
  return client;
}

export async function getFileClient(): Promise<FileClient> {
  return getRiskGradedControlContext().ensureClient<FileClient>("fileClient");
}

export async function getOuaaClient(): Promise<OuaaClient> {
  return getRiskGradedControlContext().ensureClient<OuaaClient>("ouaaClient");
}

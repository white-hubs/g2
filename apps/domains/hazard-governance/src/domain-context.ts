import type { FileClient } from "@g2-client/file/client";
import type { HazardGovernanceClient } from "@g2-client/hazard-governance/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { RiskGradedControlClient } from "@g2-client/risk-graded-control/client";
import type { DomainContext } from "@g2-composition/contract";
import type { InjectionKey } from "vue";

export const DOMAIN_CONTEXT_KEY: InjectionKey<DomainContext> = Symbol("hazard-governance-domain-context");

let context: DomainContext | undefined;
let client: HazardGovernanceClient | undefined;

export function installHazardGovernanceContext(nextContext: DomainContext, nextClient: HazardGovernanceClient): void {
  context = nextContext;
  client = nextClient;
}

export function getHazardGovernanceContext(): DomainContext {
  if (!context) throw new Error("hazard-governance domain not installed");
  return context;
}

export function getHazardGovernanceClient(): HazardGovernanceClient {
  if (!client) throw new Error("hazard-governance domain not installed");
  return client;
}

export async function getFileClient(): Promise<FileClient> {
  return getHazardGovernanceContext().ensureClient<FileClient>("fileClient");
}

export async function getOuaaClient(): Promise<OuaaClient> {
  return getHazardGovernanceContext().ensureClient<OuaaClient>("ouaaClient");
}

export async function getRiskGradedControlClient(): Promise<RiskGradedControlClient> {
  return getHazardGovernanceContext().ensureClient<RiskGradedControlClient>("riskGradedControlClient");
}

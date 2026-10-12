import type { RiskManagementClient } from "@g2-client/risk-management/client";
import type { DomainContext } from "@g2-composition/contract";
import type { InjectionKey } from "vue";

export const DOMAIN_CONTEXT_KEY: InjectionKey<DomainContext> = Symbol("risk-management-domain-context");
let context: DomainContext | undefined;
let client: RiskManagementClient | undefined;

export function installRiskManagementContext(ctx: DomainContext, nextClient: RiskManagementClient): void {
  context = ctx;
  client = nextClient;
}

export function getRiskManagementContext(): DomainContext {
  if (!context) throw new Error("risk-management domain not installed");
  return context;
}

export function getRiskManagementClient(): RiskManagementClient {
  if (!client) throw new Error("risk-management domain not installed");
  return client;
}

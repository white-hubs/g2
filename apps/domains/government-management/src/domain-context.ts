import type { DomainContext } from "@g2-composition/contract";
import type { GovernmentManagementClient } from "@g2-contract/government-management";

let domainContext: DomainContext | undefined;
let governmentClient: GovernmentManagementClient | undefined;

export function installGovernmentContext(context: DomainContext, client: GovernmentManagementClient): void {
  domainContext = context;
  governmentClient = client;
}

export function getGovernmentContext(): DomainContext {
  if (!domainContext) {
    throw new Error("行政管理 Domain 未安装");
  }
  return domainContext;
}

export function getGovernmentClient(): GovernmentManagementClient {
  if (!governmentClient) {
    throw new Error("行政管理 Client 未安装");
  }
  return governmentClient;
}

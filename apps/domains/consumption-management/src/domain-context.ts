import type { DomainContext } from "@g2-composition/contract";
import type { ConsumptionManagementClient } from "@g2-contract/consumption-management";

let domainContext: DomainContext | undefined;
let consumptionManagementClient: ConsumptionManagementClient | undefined;

export function installConsumptionManagementContext(context: DomainContext, client: ConsumptionManagementClient): void {
  domainContext = context;
  consumptionManagementClient = client;
}

export function getConsumptionManagementClient(): ConsumptionManagementClient {
  if (!consumptionManagementClient || !domainContext) {
    throw new Error("消费管理 Client 未安装");
  }
  return consumptionManagementClient;
}

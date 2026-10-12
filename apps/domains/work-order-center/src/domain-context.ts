import type { WorkOrderCenterClient as ClientContract } from "@g2-client/work-order-center/client";
import type { DomainContext } from "@g2-composition/contract";

let domainContext: DomainContext | null = null;
let workOrderCenterClient: ClientContract | null = null;

export function installWorkOrderCenterContext(context: DomainContext, client: ClientContract): void {
  domainContext = context;
  workOrderCenterClient = client;
}

export function getWorkOrderCenterContext(): DomainContext {
  if (!domainContext) {
    throw new Error("work-order-center domain not installed");
  }
  return domainContext;
}

export function getWorkOrderCenterClient(): ClientContract {
  if (!workOrderCenterClient) {
    throw new Error("work-order-center client not installed");
  }
  return workOrderCenterClient;
}

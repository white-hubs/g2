import type { DomainContext } from "@g2-composition/contract";
import type { PersonnelManagementClient } from "@g2-contract/person-management";

let domainContext: DomainContext | undefined;
let personnelClient: PersonnelManagementClient | undefined;

export function installPersonManagementContext(context: DomainContext, client: PersonnelManagementClient): void {
  domainContext = context;
  personnelClient = client;
}

export function getPersonManagementContext(): DomainContext {
  if (!domainContext) {
    throw new Error("人事管理 Domain 未安装");
  }
  return domainContext;
}

export function getPersonManagementClient(): PersonnelManagementClient {
  if (!personnelClient) {
    throw new Error("人事管理 Client 未安装");
  }
  return personnelClient;
}

import type { DomainContext } from "@g2-composition/contract";
import type { FactoryManagementClient } from "@g2-contract/factory-management";
import type { FileClient } from "@g2-contract/file";

let domainContext: DomainContext | undefined;
let factoryManagementClient: FactoryManagementClient | undefined;

export function installFactoryManagementContext(context: DomainContext, client: FactoryManagementClient): void {
  domainContext = context;
  factoryManagementClient = client;
}

export function getFactoryManagementClient(): FactoryManagementClient {
  if (!factoryManagementClient) {
    throw new Error("园区管理 Client 未安装");
  }
  return factoryManagementClient;
}

export function getFactoryManagementTenantCode(): string {
  if (!domainContext) {
    throw new Error("园区管理 Domain 未安装");
  }
  return domainContext.getAuthHeaders().tenant?.trim() ?? "";
}

export function getFileClient(): Promise<FileClient> {
  if (!domainContext) {
    throw new Error("园区管理 Domain 未安装");
  }
  return domainContext.ensureClient<FileClient>("fileClient");
}

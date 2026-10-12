import type { DomainContext } from "@g2-composition/contract";
import type { BusinessConfigClient } from "@g2-contract/business-config";

let client: BusinessConfigClient | undefined;
let domainContext: DomainContext | undefined;

export function installBusinessConfigContext(context: DomainContext): void {
  domainContext = context;
}

export function installBusinessConfigClient(value: BusinessConfigClient): void {
  client = value;
}

export function getBusinessConfigClient(): BusinessConfigClient {
  if (!client) throw new Error("基础管理 Client 尚未安装");
  return client;
}

export function hasBusinessConfigFunction(code: string): boolean {
  if (!domainContext) throw new Error("基础管理 Domain 尚未安装");
  return domainContext.getFunctionCodes().has(code);
}

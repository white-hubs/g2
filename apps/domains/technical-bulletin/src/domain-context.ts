import type { TechnicalBulletinClient } from "@g2-client/technical-bulletin/client";
import type { DomainContext } from "@g2-composition/contract";
import type { FileClient } from "@g2-contract/file";

let domainContext: DomainContext | undefined;
let bulletinClient: TechnicalBulletinClient | undefined;

export function installTechnicalBulletinContext(context: DomainContext, client: TechnicalBulletinClient): void {
  domainContext = context;
  bulletinClient = client;
}

export function getTechnicalBulletinClient(): TechnicalBulletinClient {
  if (!bulletinClient) {
    throw new Error("通知公告 Client 未安装");
  }
  return bulletinClient;
}

export function getFileClient(): Promise<FileClient> {
  if (!domainContext) {
    throw new Error("通知公告 Domain 未安装");
  }
  return domainContext.ensureClient<FileClient>("fileClient");
}

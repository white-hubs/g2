import type { DomainContext } from "@g2-composition/contract";
import type { AssetClient } from "@g2-contract/asset-management";
import type { FileClient } from "@g2-contract/file";
let context: DomainContext | undefined;
let client: AssetClient | undefined;
export function installContext(next: DomainContext, nextClient: AssetClient): void {
  context = next;
  client = nextClient;
}
export function getContext(): DomainContext {
  if (!context) {
    throw new Error("资产管理领域尚未安装");
  }
  return context;
}
export function getClient(): AssetClient {
  if (!client) {
    throw new Error("资产管理 Client 尚未初始化");
  }
  return client;
}
export function getFileClient(): Promise<FileClient> {
  return getContext().ensureClient<FileClient>("fileClient");
}

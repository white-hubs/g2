import type { DomainContext } from "@g2-composition/contract";
import type { UserCenterClient } from "@g2-contract/user-center";

let installedClient: UserCenterClient | undefined;
let installedContext: DomainContext | undefined;

export function installUserCenterContext(ctx: DomainContext, client: UserCenterClient): void {
  installedContext = ctx;
  installedClient = client;
}

export function getUserCenterClient(): UserCenterClient {
  if (!installedClient) throw new Error("用户中心服务尚未安装");
  return installedClient;
}

export function getUserCenterContext(): DomainContext {
  if (!installedContext) throw new Error("用户中心尚未安装");
  return installedContext;
}

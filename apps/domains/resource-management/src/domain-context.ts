import type { ResourceManagementClient } from "@g2-contract/resource-management";

let installedClient: ResourceManagementClient | undefined;
let installedTerminal = "bimops-manage-web";
let installedTenant = "";
export function installResourceManagementClient(client: ResourceManagementClient, terminal: string, tenant: string): void {
  installedClient = client;
  installedTerminal = terminal;
  installedTenant = tenant;
}
export function getResourceRuntime(): { terminal: string; tenant: string } {
  return { terminal: installedTerminal, tenant: installedTenant };
}
export function getResourceManagementClient(): ResourceManagementClient {
  if (!installedClient) throw new Error("资源管理服务尚未安装");
  return installedClient;
}

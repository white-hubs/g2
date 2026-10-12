import type { DomainContext } from "@g2-composition/contract";
import type { FileClient } from "@g2-contract/file";
import type { OuaaClient } from "@g2-contract/ouaa";
import type { SecureEduClient } from "@g2-contract/secure-edu";
import { inject } from "vue";
import type { RouteLocationRaw } from "vue-router";
export interface EduPageNavigation {
  basePath: string;
  headquarters?: boolean;
  push: (location: RouteLocationRaw) => Promise<unknown>;
}
export function useNavigation(): EduPageNavigation {
  const host = inject<EduPageNavigation>("secureEdu:navigation");
  if (!host) {
    throw new Error("安全教育页面缺少宿主导航");
  }
  return host;
}
let context: DomainContext | undefined;
let client: SecureEduClient | undefined;
export function installContext(next: DomainContext, nextClient: SecureEduClient) {
  context = next;
  client = nextClient;
}
export function getContext(): DomainContext {
  if (!context) {
    throw new Error("安全教育尚未安装");
  }
  return context;
}
export function getClient() {
  if (!client) {
    throw new Error("安全教育 Client 尚未安装");
  }
  return client.market;
}
export const loadUi = (): Promise<typeof import("@g2-platform/pc-ui")> => getContext().loadRuntimeCommon("pcUi", "index");
export const loadChart = (): Promise<typeof import("@g2-platform/pc-chart")> => getContext().loadRuntimeCommon("pcChart", "index");
export const getOuaa = (): Promise<OuaaClient> => getContext().ensureClient<OuaaClient>("ouaaClient");
export const getFiles = (): Promise<FileClient> => getContext().ensureClient<FileClient>("fileClient");

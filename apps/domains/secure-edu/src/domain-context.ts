import type { DomainContext } from "@g2-composition/contract";
import type { SecureEduClient } from "@g2-contract/secure-edu";
import type { InjectionKey } from "vue";

export const DOMAIN_CONTEXT_KEY: InjectionKey<DomainContext> = Symbol("secure-edu-context");

let installedContext: DomainContext | undefined;
let installedClient: SecureEduClient | undefined;
let installedPcChart: typeof import("@g2-platform/pc-chart") | undefined;

export function installSecureEduContext(ctx: DomainContext, client: SecureEduClient): void {
  installedContext = ctx;
  installedClient = client;
}

export function getSecureEduContext(): DomainContext {
  if (!installedContext) throw new Error("安全教育尚未安装");
  return installedContext;
}

export function getSecureEduClient(): SecureEduClient {
  if (!installedClient) throw new Error("安全教育服务尚未加载");
  return installedClient;
}

export function installSecureEduPcChart(module: typeof import("@g2-platform/pc-chart")): void {
  installedPcChart = module;
}

export function getSecureEduPcChart(): typeof import("@g2-platform/pc-chart") {
  if (!installedPcChart) throw new Error("安全教育图表公共模块尚未加载");
  return installedPcChart;
}

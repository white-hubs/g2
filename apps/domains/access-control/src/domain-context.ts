import type { DomainContext } from "@g2-composition/contract";
import type { InjectionKey } from "vue";

export const DOMAIN_CONTEXT_KEY: InjectionKey<DomainContext> = Symbol("access-control-domain-context");
export const APPLICATION_CODE_KEY: InjectionKey<string> = Symbol("access-control-application-code");

let installedContext: DomainContext | undefined;
let installedPcUi: typeof import("@g2-platform/pc-ui") | undefined;
let installedPcChart: typeof import("@g2-platform/pc-chart") | undefined;

export function installAccessControlContext(context: DomainContext): void {
  installedContext = context;
}

export function installAccessControlPcUi(module: typeof import("@g2-platform/pc-ui")): void {
  installedPcUi = module;
}

export function getAccessControlPcUi(): typeof import("@g2-platform/pc-ui") {
  if (!installedPcUi) throw new Error("access-control pcUi runtime has not been loaded");
  return installedPcUi;
}

export function loadAccessControlPcUi(): Promise<typeof import("@g2-platform/pc-ui")> {
  if (!installedContext) throw new Error("access-control domain not installed");
  return installedContext.loadRuntimeCommon<typeof import("@g2-platform/pc-ui")>("pcUi", "index");
}

export function installAccessControlPcChart(module: typeof import("@g2-platform/pc-chart")): void {
  installedPcChart = module;
}

export function getAccessControlPcChart(): typeof import("@g2-platform/pc-chart") {
  if (!installedPcChart) throw new Error("access-control pcChart runtime has not been loaded");
  return installedPcChart;
}

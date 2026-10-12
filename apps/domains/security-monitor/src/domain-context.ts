import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { MetadataClient } from "@g2-client/metadata/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { SecurityMonitorClient } from "@g2-client/security-monitor/client";
import type { VideoMonitorClient } from "@g2-client/video-monitor/client";
import type { DomainContext } from "@g2-composition/contract";
import type { InjectionKey } from "vue";

export const DOMAIN_CONTEXT_KEY: InjectionKey<DomainContext> = Symbol("security-monitor-domain-context");
export const APPLICATION_CODE_KEY: InjectionKey<string> = Symbol("security-monitor-application-code");

interface EmergencyManagementClient {
  getAlarmNoticeConfig: (businessType: string) => Promise<unknown>;
  saveAlarmNoticeConfig: (payload: unknown) => Promise<unknown>;
  getNoticeMethods: (sceneCode: string) => Promise<unknown>;
}

let installContext: DomainContext | undefined;
let installedPcChart: typeof import("@g2-platform/pc-chart") | undefined;

export function installSecurityMonitorContext(ctx: DomainContext): void {
  installContext = ctx;
}

export function getSecurityMonitorContext(): DomainContext {
  if (!installContext) {
    throw new Error("security-monitor domain not installed");
  }
  return installContext;
}

export function installSecurityMonitorPcChart(module: typeof import("@g2-platform/pc-chart")): void {
  installedPcChart = module;
}

export function getSecurityMonitorPcChart(): typeof import("@g2-platform/pc-chart") {
  if (!installedPcChart) throw new Error("security-monitor pcChart runtime has not been loaded");
  return installedPcChart;
}

export function getSecurityMonitorClient(): Promise<SecurityMonitorClient> {
  return getSecurityMonitorContext().ensureClient<SecurityMonitorClient>("securityMonitorClient");
}

export function getSecurityAlarmClient(): Promise<AlarmCenterClient> {
  return getSecurityMonitorContext().ensureClient<AlarmCenterClient>("alarmCenterClient");
}

export function getSecurityDeviceClient(): Promise<DeviceCenterClient> {
  return getSecurityMonitorContext().ensureClient<DeviceCenterClient>("deviceCenterClient");
}

/** 通用报警消息配置使用消息中心接口，不绑定应急管理 Domain。 */
export function getSecurityMessageConfigClient(): Promise<EmergencyManagementClient> {
  return getSecurityMonitorContext().ensureClient<EmergencyManagementClient>("emergencyManagementClient");
}

export function getSecurityOuaaClient(): Promise<OuaaClient> {
  return getSecurityMonitorContext().ensureClient<OuaaClient>("ouaaClient");
}

export function getSecurityMetadataClient(): Promise<MetadataClient> {
  return getSecurityMonitorContext().ensureClient<MetadataClient>("metadataClient");
}

/** 主数据区域树，走网关 `/api/mdata/area/*`（本地环境 metadata BFF 上游常不可达）。 */
export function getSecurityMdataClient(): Promise<{
  getAreaList: (query?: Record<string, unknown>) => Promise<unknown>;
  getAreaTree: (query?: Record<string, unknown>) => Promise<unknown>;
}> {
  return getSecurityMonitorContext().ensureClient("mdataClient");
}

/** `video-monitor-auth` 的监控授权与 AI 巡检专用客户端。 */
export function getVideoMonitorClient(): Promise<VideoMonitorClient> {
  return getSecurityMonitorContext().ensureClient<VideoMonitorClient>("videoMonitorClient");
}

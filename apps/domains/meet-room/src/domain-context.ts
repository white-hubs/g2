import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { MdataClient } from "@g2-client/mdata/client";
import type { MeetRoomClient } from "@g2-client/meet-room/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { DomainContext } from "@g2-composition/contract";

let domainContext: DomainContext | undefined;
let meetRoomClient: MeetRoomClient | undefined;
let applicationCode = "MEETING_ROOM_MANAGEM";
let pcChart: typeof import("@g2-platform/pc-chart") | undefined;

export function installMeetRoomContext(context: DomainContext, client: MeetRoomClient, config?: Record<string, unknown>): void {
  domainContext = context;
  meetRoomClient = client;
  applicationCode = typeof config?.applicationCode === "string" && config.applicationCode ? config.applicationCode : "MEETING_ROOM_MANAGEM";
}

export function installMeetRoomPcChart(module: typeof import("@g2-platform/pc-chart")): void {
  pcChart = module;
}

export function getMeetRoomContext(): DomainContext {
  if (!domainContext) {
    throw new Error("会议室管理 Domain 未安装");
  }
  return domainContext;
}

export function getMeetRoomClient(): MeetRoomClient {
  if (!meetRoomClient) {
    throw new Error("会议室管理 Client 未安装");
  }
  return meetRoomClient;
}

export function getMeetRoomApplicationCode(): string {
  return applicationCode;
}

export function getMeetRoomPcChart(): typeof import("@g2-platform/pc-chart") {
  if (!pcChart) {
    throw new Error("会议室管理图表公共模块未加载");
  }
  return pcChart;
}

export const getOuaaClient = (): Promise<OuaaClient> => getMeetRoomContext().ensureClient<OuaaClient>("ouaaClient");
export const getMdataClient = (): Promise<MdataClient> => getMeetRoomContext().ensureClient<MdataClient>("mdataClient");
export const getDeviceCenterClient = (): Promise<DeviceCenterClient> =>
  getMeetRoomContext().ensureClient<DeviceCenterClient>("deviceCenterClient");

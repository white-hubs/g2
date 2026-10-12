import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { MessageClient } from "@g2-client/message/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { OutsourceRepairClient } from "@g2-client/outsource-repair/client";
import type { DomainContext } from "@g2-composition/contract";
import type { FileClient } from "@g2-contract/file";

import { OUTSOURCE_REPAIR_BASE_PATH, resolveOutsourceRepairRuntime, type OutsourceRepairRuntime } from "./runtime";

let domainContext: DomainContext | undefined;
let outsourceRepairClient: OutsourceRepairClient | undefined;
let runtime: OutsourceRepairRuntime = resolveOutsourceRepairRuntime({ basePath: OUTSOURCE_REPAIR_BASE_PATH });

export function installOutsourceRepairContext(
  context: DomainContext,
  client: OutsourceRepairClient,
  nextRuntime?: OutsourceRepairRuntime,
): void {
  domainContext = context;
  outsourceRepairClient = client;
  if (nextRuntime) {
    runtime = nextRuntime;
  }
}

export function getOutsourceRepairContext(): DomainContext {
  if (!domainContext) {
    throw new Error("委外维修 Domain 未安装");
  }
  return domainContext;
}

export function getOutsourceRepairClient(): OutsourceRepairClient {
  if (!outsourceRepairClient) {
    throw new Error("委外维修 Client 未安装");
  }
  return outsourceRepairClient;
}

export function getOutsourceRepairRuntime(): OutsourceRepairRuntime {
  return runtime;
}

export function getDeviceCenterClient(): Promise<DeviceCenterClient> {
  return getOutsourceRepairContext().ensureClient<DeviceCenterClient>("deviceCenterClient");
}

export function getMessageClient(): Promise<MessageClient> {
  return getOutsourceRepairContext().ensureClient<MessageClient>("messageClient");
}

export function getFileClient(): Promise<FileClient> {
  return getOutsourceRepairContext().ensureClient<FileClient>("fileClient");
}

export function getOuaaClient(): Promise<OuaaClient> {
  return getOutsourceRepairContext().ensureClient<OuaaClient>("ouaaClient");
}

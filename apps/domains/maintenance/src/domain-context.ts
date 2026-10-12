import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { FileClient } from "@g2-client/file/client";
import type { MaintenanceClient } from "@g2-client/maintenance/client";
import type { MdataClient } from "@g2-client/mdata/client";
import type { MessageClient } from "@g2-client/message/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { DomainContext } from "@g2-composition/contract";

import { MAINTENANCE_BASE_PATH, resolveMaintenanceRuntime, type MaintenanceRuntime } from "./runtime";

let domainContext: DomainContext | undefined;
let maintenanceClient: MaintenanceClient | undefined;
let runtime: MaintenanceRuntime = resolveMaintenanceRuntime({ basePath: MAINTENANCE_BASE_PATH });

export function installMaintenanceContext(context: DomainContext, client: MaintenanceClient, nextRuntime?: MaintenanceRuntime): void {
  domainContext = context;
  maintenanceClient = client;
  if (nextRuntime) {
    runtime = nextRuntime;
  }
}

export function getMaintenanceContext(): DomainContext {
  if (!domainContext) {
    throw new Error("维保作业 Domain 未安装");
  }
  return domainContext;
}

export function getMaintenanceClient(): MaintenanceClient {
  if (!maintenanceClient) {
    throw new Error("维保作业 Client 未安装");
  }
  return maintenanceClient;
}

export function getMaintenanceRuntime(): MaintenanceRuntime {
  return runtime;
}

export function getDeviceCenterClient(): Promise<DeviceCenterClient> {
  return getMaintenanceContext().ensureClient<DeviceCenterClient>("deviceCenterClient");
}

export function getOuaaClient(): Promise<OuaaClient> {
  return getMaintenanceContext().ensureClient<OuaaClient>("ouaaClient");
}

export function getMdataClient(): Promise<MdataClient> {
  return getMaintenanceContext().ensureClient<MdataClient>("mdataClient");
}

export function getFileClient(): Promise<FileClient> {
  return getMaintenanceContext().ensureClient<FileClient>("fileClient");
}

export function getMessageClient(): Promise<MessageClient> {
  return getMaintenanceContext().ensureClient<MessageClient>("messageClient");
}

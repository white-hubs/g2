import type { FumigationOperationClient } from "@g2-client/fumigation-operation/client";
export type { FumigationDispatchMapConfig, FumigationMonitorPersonnelLocation } from "@g2-contract/fumigation-operation";

import { getFumigationClient } from "@/domain-context";

type Method = keyof FumigationOperationClient;

function call<K extends Method>(method: K, ...args: Parameters<FumigationOperationClient[K]>): ReturnType<FumigationOperationClient[K]> {
  const client = getFumigationClient();
  const operation = client[method] as unknown as (...values: unknown[]) => unknown;
  return operation(...args) as ReturnType<FumigationOperationClient[K]>;
}

export const listFumigationWorks = (...args: Parameters<FumigationOperationClient["listFumigationWorks"]>) =>
  call("listFumigationWorks", ...args);
export const getFumigationWork = (...args: Parameters<FumigationOperationClient["getFumigationWork"]>) =>
  call("getFumigationWork", ...args);
export const createFumigationWork = (...args: Parameters<FumigationOperationClient["createFumigationWork"]>) =>
  call("createFumigationWork", ...args);
export const submitFumigationApproval = (...args: Parameters<FumigationOperationClient["submitFumigationApproval"]>) =>
  call("submitFumigationApproval", ...args);
export const getFumigationPrechecks = (...args: Parameters<FumigationOperationClient["getFumigationPrechecks"]>) =>
  call("getFumigationPrechecks", ...args);
export const runFumigationPrecheck = (...args: Parameters<FumigationOperationClient["runFumigationPrecheck"]>) =>
  call("runFumigationPrecheck", ...args);
export const runFumigationPrechecks = (...args: Parameters<FumigationOperationClient["runFumigationPrechecks"]>) =>
  call("runFumigationPrechecks", ...args);
export const completeFumigationWork = (...args: Parameters<FumigationOperationClient["completeFumigationWork"]>) =>
  call("completeFumigationWork", ...args);
export const terminateFumigationWork = (...args: Parameters<FumigationOperationClient["terminateFumigationWork"]>) =>
  call("terminateFumigationWork", ...args);
export const sendFumigationNotification = (...args: Parameters<FumigationOperationClient["sendFumigationNotification"]>) =>
  call("sendFumigationNotification", ...args);
export const listFumigationWarehouses = (...args: Parameters<FumigationOperationClient["listFumigationWarehouses"]>) =>
  call("listFumigationWarehouses", ...args);
export const listFumigationGrainVarieties = (...args: Parameters<FumigationOperationClient["listFumigationGrainVarieties"]>) =>
  call("listFumigationGrainVarieties", ...args);
export const listFumigationPesticideTypes = (...args: Parameters<FumigationOperationClient["listFumigationPesticideTypes"]>) =>
  call("listFumigationPesticideTypes", ...args);
export const listFumigationApplicationMethods = (...args: Parameters<FumigationOperationClient["listFumigationApplicationMethods"]>) =>
  call("listFumigationApplicationMethods", ...args);
export const listFumigationDevices = (...args: Parameters<FumigationOperationClient["listFumigationDevices"]>) =>
  call("listFumigationDevices", ...args);
export const getFumigationDeviceMonitor = (...args: Parameters<FumigationOperationClient["getFumigationDeviceMonitor"]>) =>
  call("getFumigationDeviceMonitor", ...args);
export const getFumigationDeviceProperties = (...args: Parameters<FumigationOperationClient["getFumigationDeviceProperties"]>) =>
  call("getFumigationDeviceProperties", ...args);
export const listFumigationLinkedDevices = (...args: Parameters<FumigationOperationClient["listFumigationLinkedDevices"]>) =>
  call("listFumigationLinkedDevices", ...args);
export const listFumigationAssociatedVideos = (...args: Parameters<FumigationOperationClient["listFumigationAssociatedVideos"]>) =>
  call("listFumigationAssociatedVideos", ...args);
export const listFumigationWorkers = (...args: Parameters<FumigationOperationClient["listFumigationWorkers"]>) =>
  call("listFumigationWorkers", ...args);
export const listFumigationArchives = (...args: Parameters<FumigationOperationClient["listFumigationArchives"]>) =>
  call("listFumigationArchives", ...args);
export const generateFumigationArchive = (...args: Parameters<FumigationOperationClient["generateFumigationArchive"]>) =>
  call("generateFumigationArchive", ...args);
export const getFumigationArchiveDocument = (...args: Parameters<FumigationOperationClient["getFumigationArchiveDocument"]>) =>
  call("getFumigationArchiveDocument", ...args);
export const getFumigationRealtimeSituation = (...args: Parameters<FumigationOperationClient["getFumigationRealtimeSituation"]>) =>
  call("getFumigationRealtimeSituation", ...args);
export const getFumigationRealtimeSituationStats = (
  ...args: Parameters<FumigationOperationClient["getFumigationRealtimeSituationStats"]>
) => call("getFumigationRealtimeSituationStats", ...args);
export const getFumigationRealtimeSituationWorks = (
  ...args: Parameters<FumigationOperationClient["getFumigationRealtimeSituationWorks"]>
) => call("getFumigationRealtimeSituationWorks", ...args);
export const listFumigationRealtimeSituationWarehouses = (
  ...args: Parameters<FumigationOperationClient["listFumigationRealtimeSituationWarehouses"]>
) => call("listFumigationRealtimeSituationWarehouses", ...args);
export const listFumigationRealtimeSituationDevices = (
  ...args: Parameters<FumigationOperationClient["listFumigationRealtimeSituationDevices"]>
) => call("listFumigationRealtimeSituationDevices", ...args);
export const listFumigationRealtimeSituationAlarms = (
  ...args: Parameters<FumigationOperationClient["listFumigationRealtimeSituationAlarms"]>
) => call("listFumigationRealtimeSituationAlarms", ...args);
export const getFumigationDispatchMapConfig = (...args: Parameters<FumigationOperationClient["getFumigationDispatchMapConfig"]>) =>
  call("getFumigationDispatchMapConfig", ...args);
export const listFumigationMonitorPersonnelLocations = (
  ...args: Parameters<FumigationOperationClient["listFumigationMonitorPersonnelLocations"]>
) => call("listFumigationMonitorPersonnelLocations", ...args);

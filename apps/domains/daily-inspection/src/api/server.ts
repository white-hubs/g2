import type { DailyInspectionClient } from "@g2-contract/daily-inspection";

import { getDailyInspectionClient } from "../domain-context";

/**
 * 旧页面使用同步 service 单例；MF Domain 的 client 在 install 阶段注入。
 * Proxy 保留原调用形态，同时确保所有 HTTP 都经 dailyInspectionClient。
 */
function clientProxy(): DailyInspectionClient {
  return new Proxy({} as DailyInspectionClient, {
    get(_target, property) {
      const client = getDailyInspectionClient() as unknown as Record<PropertyKey, unknown>;
      const value = client[property];
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}

export const cubeDailyInspectionService = clientProxy();
export const cubeMdataService = cubeDailyInspectionService;
export const cubeSmallEngineeringService = cubeDailyInspectionService;
export const cubeDeviceCenterService = cubeDailyInspectionService;
export const cubeAssetManagementService = cubeDailyInspectionService;
export const cubeRiskTypeService = cubeDailyInspectionService;
export const cubeMaintainService = cubeDailyInspectionService;

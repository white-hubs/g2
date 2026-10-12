import type { DailyTaskClient } from "@g2-client/daily-task/client";

import { getDailyTaskClient } from "../domain-context";

/**
 * 旧页面使用同步 service 单例；MF Domain 的 client 在 install 阶段注入。
 * Proxy 保留原调用形态，同时确保所有 HTTP 都经 dailyTaskClient/httpPlatform。
 */
function clientProxy(): DailyTaskClient {
  return new Proxy({} as DailyTaskClient, {
    get(_target, property) {
      const client = getDailyTaskClient() as unknown as Record<PropertyKey, unknown>;
      const value = client[property];
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}

export const cubeDailyTaskService = clientProxy();
export const cubeBusinessTagService = cubeDailyTaskService;
export const cubeMessageCenterService = cubeDailyTaskService;
export const cubeMdataService = cubeDailyTaskService;
export const cubeSmallEngineeringService = cubeDailyTaskService;
export const cubeDeviceCenterService = cubeDailyTaskService;
export const cubeAssetManagementService = cubeDailyTaskService;
export const cubeRiskTypeService = cubeDailyTaskService;
export const cubeMaintainService = cubeDailyTaskService;

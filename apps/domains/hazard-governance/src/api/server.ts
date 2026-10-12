/**
 * 旧页面曾直接导入全局 service 单例。这里改为在 Domain install 后从
 * `hazardGovernanceClient` 取得实例，所有请求继续经过 g2 的 http platform。
 */
import type { HazardGovernanceClient } from "@g2-client/hazard-governance/client";

import { getHazardGovernanceClient } from "../domain-context";

function clientProxy(): HazardGovernanceClient {
  return new Proxy({} as HazardGovernanceClient, {
    get(_target, property) {
      const client = getHazardGovernanceClient() as unknown as Record<PropertyKey, unknown>;
      const value = client[property];
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}

export const hazardService = clientProxy();

const bind = <K extends keyof HazardGovernanceClient>(method: K): HazardGovernanceClient[K] =>
  hazardService[method].bind(hazardService) as HazardGovernanceClient[K];

export const getHazardCategoryTree = bind("getHazardCategoryTree");
export const generateHazardCategoriesByAi = bind("generateHazardCategoriesByAi");
export const createHazardCategory = bind("createHazardCategory");
export const batchCreateHazardCategories = bind("batchCreateHazardCategories");
export const updateHazardCategory = bind("updateHazardCategory");
export const deleteHazardCategory = bind("deleteHazardCategory");
export const createHazardApprovalTemplate = bind("createHazardApprovalTemplate");
export const updateHazardApprovalTemplate = bind("updateHazardApprovalTemplate");
export const deleteHazardApprovalTemplate = bind("deleteHazardApprovalTemplate");
export const listHazardApprovalTemplates = bind("listHazardApprovalTemplates");
export const pageHazardApprovalTemplates = bind("pageHazardApprovalTemplates");
export const pageHazardLedger = bind("pageHazardLedger");
export const getHazardDetail = bind("getHazardDetail");
export const createHazardPendingConfirmation = bind("createHazardPendingConfirmation");
export const batchCreateHazardPendingConfirmation = bind("batchCreateHazardPendingConfirmation");
export const recognizeHazardsByAi = bind("recognizeHazardsByAi");
export const confirmHazard = bind("confirmHazard");
export const markHazardMisreport = bind("markHazardMisreport");
export const urgeHazard = bind("urgeHazard");
export const pageHazardApprovalTasks = bind("pageHazardApprovalTasks");
export const getHazardApprovalTaskDetail = bind("getHazardApprovalTaskDetail");
export const approveHazardApprovalTask = bind("approveHazardApprovalTask");
export const rejectHazardApprovalTask = bind("rejectHazardApprovalTask");
export const pageHazardAcceptanceTasks = bind("pageHazardAcceptanceTasks");
export const getHazardAcceptanceDetail = bind("getHazardAcceptanceDetail");
export const submitHazardAcceptance = bind("submitHazardAcceptance");
export const acceptHazardAcceptance = bind("acceptHazardAcceptance");
export const pageHazardRectificationTasks = bind("pageHazardRectificationTasks");
export const submitHazardRectificationPlan = bind("submitHazardRectificationPlan");
export const getLatestHazardRectificationProgress = bind("getLatestHazardRectificationProgress");
export const createHazardRectificationProgress = bind("createHazardRectificationProgress");
export const getHazardTodoStatistics = bind("getHazardTodoStatistics");
export const pageHazardTodoItems = bind("pageHazardTodoItems");
export const getHazardDashboardSummary = bind("getHazardDashboardSummary");
export const getHazardDashboardCharts = bind("getHazardDashboardCharts");
export const getHazardDashboardRankings = bind("getHazardDashboardRankings");
export const getHazardRepeatedRectificationSummary = bind("getHazardRepeatedRectificationSummary");
export const pageHazardRepeatedRectifications = bind("pageHazardRepeatedRectifications");
export const getHazardRepeatedRectificationDetail = bind("getHazardRepeatedRectificationDetail");
export const decideHazardRepeatedRectification = bind("decideHazardRepeatedRectification");

import { getWorkbenchClient } from "../domain-context";

/**
 * 领域侧服务门面：保持旧仓 `cubeXxxService.method` 调用形态，
 * 实际统一转发到 workbenchClient（避免逐文件改方法名引入回归）。
 */
export const cubeWorkbenchService = {
  getCards: (...args: Parameters<ReturnType<typeof getWorkbenchClient>["getCards"]>) => getWorkbenchClient().getCards(...args),
  getNoUseCards: (...args: Parameters<ReturnType<typeof getWorkbenchClient>["getNoUseCards"]>) =>
    getWorkbenchClient().getNoUseCards(...args),
  deleteHomeCard: (...args: Parameters<ReturnType<typeof getWorkbenchClient>["deleteHomeCard"]>) =>
    getWorkbenchClient().deleteHomeCard(...args),
  saveHomeCard: (...args: Parameters<ReturnType<typeof getWorkbenchClient>["saveHomeCard"]>) => getWorkbenchClient().saveHomeCard(...args),
  getUserMemoPage: (...args: Parameters<ReturnType<typeof getWorkbenchClient>["getUserMemoPage"]>) =>
    getWorkbenchClient().getUserMemoPage(...args),
  createUserMemo: (...args: Parameters<ReturnType<typeof getWorkbenchClient>["createUserMemo"]>) =>
    getWorkbenchClient().createUserMemo(...args),
  updateUserMemo: (...args: Parameters<ReturnType<typeof getWorkbenchClient>["updateUserMemo"]>) =>
    getWorkbenchClient().updateUserMemo(...args),
  deleteUserMemo: (...args: Parameters<ReturnType<typeof getWorkbenchClient>["deleteUserMemo"]>) =>
    getWorkbenchClient().deleteUserMemo(...args),
};

export const cubeTodoTaskStatService = {
  getTodoTaskCount: () => getWorkbenchClient().getTodoTaskCount(),
  getTodoTaskTags: () => getWorkbenchClient().getTodoTaskTags(),
  getDoneTaskCount: () => getWorkbenchClient().getDoneTaskCount(),
  getDoneTaskTags: () => getWorkbenchClient().getDoneTaskTags(),
};

export const cubeAnnouncementService = {
  listAnnouncement: (params?: Record<string, unknown>) => getWorkbenchClient().listAnnouncement(params),
};

export const cubeOuaaService = {
  getFrequentMenus: () => getWorkbenchClient().getFrequentMenus(),
};

export const cubeAppService = {
  getApplicationGroups: () => getWorkbenchClient().getApplicationGroups(),
};

export const cubeEnergyStatService = {
  getSummaryStat: (params?: Record<string, unknown>) => getWorkbenchClient().getSummaryStat(params),
  getStatTrend: (params?: Record<string, unknown>) => getWorkbenchClient().getStatTrend(params),
  ClassifySettingsPage: (params?: Record<string, unknown>) => getWorkbenchClient().ClassifySettingsPage(params),
  getEnergyStatProject: (params?: Record<string, unknown>) => getWorkbenchClient().getEnergyStatProject(params),
};

export const cubeDeviceCenterService = {
  getDeviceStatusCountByTagCode: (params?: Record<string, unknown>) => getWorkbenchClient().getDeviceStatusCountByTagCode(params),
};

export const cubeAlarmStatService = {
  alarmSummaryStat: (params?: Record<string, unknown>) => getWorkbenchClient().alarmSummaryStat(params),
  alarmSummaryStatByTypeRank: (params?: Record<string, unknown>) => getWorkbenchClient().alarmSummaryStatByTypeRank(params),
  alarmTrendStat: (params?: Record<string, unknown>) => getWorkbenchClient().alarmTrendStat(params),
};

export const cubeSafetyManagementStatService = {
  alarmStatusStat: (params?: Record<string, unknown>) => getWorkbenchClient().alarmStatusStat(params),
  alarmActualRatioStat: (params?: Record<string, unknown>) => getWorkbenchClient().alarmActualRatioStat(params),
  propertyFilingStat: (params?: Record<string, unknown>) => getWorkbenchClient().propertyFilingStat(params),
};

export const cubeSafetyManagementMarketService = {
  listMarket: (params?: Record<string, unknown>) => getWorkbenchClient().listMarket(params),
};

export async function fetchAssistantSkills() {
  return getWorkbenchClient().fetchAssistantSkills();
}

import type {
  AssistantSkillOption,
  WorkbenchCard,
  WorkbenchNoUseCardQuery,
  WorkbenchUserMemoModifyParam,
  WorkbenchUserMemoPage,
  WorkbenchUserMemoPageQuery,
} from "./types";

/**
 * 工作台 Client 门面：聚合首页卡片依赖的多服务面 `/api/*` 调用。
 * 方法名尽量对齐旧仓 service 代理，便于领域侧 1:1 迁入。
 */
export type WorkbenchClient = {
  // ouaa / workbench 本域
  getCards: () => Promise<WorkbenchCard[]>;
  getNoUseCards: (query: WorkbenchNoUseCardQuery) => Promise<WorkbenchCard[]>;
  deleteHomeCard: (code: string) => Promise<void>;
  saveHomeCard: (cards: Record<string, unknown>[]) => Promise<void>;
  getUserMemoPage: (query: WorkbenchUserMemoPageQuery) => Promise<WorkbenchUserMemoPage>;
  createUserMemo: (payload: WorkbenchUserMemoModifyParam) => Promise<number>;
  updateUserMemo: (id: string, payload: WorkbenchUserMemoModifyParam) => Promise<void>;
  deleteUserMemo: (id: string) => Promise<void>;
  getFrequentMenus: () => Promise<unknown>;
  getApplicationGroups: () => Promise<unknown>;

  // todo
  getTodoTaskCount: () => Promise<number>;
  getTodoTaskTags: () => Promise<unknown[]>;
  getDoneTaskCount: () => Promise<number>;
  getDoneTaskTags: () => Promise<unknown[]>;

  // announcement
  listAnnouncement: (params?: Record<string, unknown>) => Promise<unknown>;

  // energy
  getSummaryStat: (params?: Record<string, unknown>) => Promise<unknown>;
  getStatTrend: (params?: Record<string, unknown>) => Promise<unknown>;
  ClassifySettingsPage: (params?: Record<string, unknown>) => Promise<unknown>;
  getEnergyStatProject: (params?: Record<string, unknown>) => Promise<unknown>;

  // device
  getDeviceStatusCountByTagCode: (params?: Record<string, unknown>) => Promise<unknown>;

  // alarm
  alarmSummaryStat: (params?: Record<string, unknown>) => Promise<unknown>;
  alarmSummaryStatByTypeRank: (params?: Record<string, unknown>) => Promise<unknown>;
  alarmTrendStat: (params?: Record<string, unknown>) => Promise<unknown>;

  // safety
  alarmStatusStat: (params?: Record<string, unknown>) => Promise<unknown>;
  alarmActualRatioStat: (params?: Record<string, unknown>) => Promise<unknown>;
  propertyFilingStat: (params?: Record<string, unknown>) => Promise<unknown>;
  listMarket: (params?: Record<string, unknown>) => Promise<unknown>;

  // ai-center skills
  fetchAssistantSkills: () => Promise<AssistantSkillOption[]>;
};

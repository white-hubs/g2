import type { Pagination } from "@g2-contract/base";

import type {
  HazardAcceptanceCommand,
  HazardAcceptanceDetailVO,
  HazardApprovalCommand,
  HazardApprovalDetailVO,
  HazardApprovalTemplateCommand,
  HazardApprovalTemplatePageParams,
  HazardApprovalTemplateVO,
  HazardAcceptanceTaskPageParams,
  HazardAcceptanceTaskPageVO,
  HazardApprovalTaskPageParams,
  HazardApprovalTaskPageVO,
  HazardAiCategoryGenerationCommand,
  HazardAiCategoryGenerationVO,
  HazardAiRecognitionCommand,
  HazardAiRecognitionVO,
  HazardCategoryBatchCreateCommand,
  HazardCategoryCommand,
  HazardCategoryTreeVO,
  HazardConfirmCommand,
  HazardDetailVO,
  HazardLedgerPageParams,
  HazardLedgerRecordVO,
  HazardMisreportCommand,
  HazardPendingConfirmationCreateCommand,
  HazardPendingConfirmationRecordVO,
  HazardRectificationTaskPageParams,
  HazardRectificationTaskVO,
  HazardRectificationPlanCommand,
  HazardRectificationProgressCommand,
  HazardRectificationProgressVO,
  HazardDashboardChartsVO,
  HazardDashboardParams,
  HazardDashboardRankingParams,
  HazardDashboardRankingVO,
  HazardDashboardSummaryVO,
  HazardRepeatedRectificationDetailParams,
  HazardRepeatedRectificationDetailVO,
  HazardRepeatedRectificationDecisionCommand,
  HazardRepeatedRectificationPageParams,
  HazardRepeatedRectificationPageVO,
  HazardRepeatedRectificationSummaryParams,
  HazardRepeatedRectificationSummaryVO,
  HazardTodoItemVO,
  HazardTodoPageParams,
  HazardTodoStatisticVO,
} from "./types";

/** 隐患治理 BFF 契约 */
export interface HazardGovernanceGateway {
  /** 查询隐患分类树 */
  getHazardCategoryTree: () => Promise<HazardCategoryTreeVO[]>;

  /** AI根据行业生成隐患分类 */
  generateHazardCategoriesByAi: (payload: HazardAiCategoryGenerationCommand) => Promise<HazardAiCategoryGenerationVO>;

  /** 新增隐患分类 */
  createHazardCategory: (payload: HazardCategoryCommand) => Promise<string>;

  /** 批量新增隐患分类 */
  batchCreateHazardCategories: (payload: HazardCategoryBatchCreateCommand) => Promise<Array<string | number>>;

  /** 修改隐患分类 */
  updateHazardCategory: (id: string, payload: HazardCategoryCommand) => Promise<void>;

  /** 删除隐患分类 */
  deleteHazardCategory: (id: string) => Promise<void>;

  /** 新增审批模板 */
  createHazardApprovalTemplate: (payload: HazardApprovalTemplateCommand) => Promise<string>;

  /** 修改审批模板 */
  updateHazardApprovalTemplate: (id: string, payload: HazardApprovalTemplateCommand) => Promise<void>;

  /** 删除审批模板 */
  deleteHazardApprovalTemplate: (id: string) => Promise<void>;

  /** 查询审批模板列表 */
  listHazardApprovalTemplates: (params?: Partial<HazardApprovalTemplatePageParams>) => Promise<HazardApprovalTemplateVO[]>;

  /** 分页查询审批模板 */
  pageHazardApprovalTemplates: (params: HazardApprovalTemplatePageParams) => Promise<Pagination<HazardApprovalTemplateVO>>;

  /** 隐患台账分页 */
  pageHazardLedger: (params: HazardLedgerPageParams) => Promise<Pagination<HazardLedgerRecordVO>>;

  /** 查询隐患详情 */
  getHazardDetail: (id: string | number) => Promise<HazardDetailVO>;

  /** 新增待确认隐患记录 */
  createHazardPendingConfirmation: (payload: HazardPendingConfirmationCreateCommand) => Promise<HazardPendingConfirmationRecordVO>;

  /** 批量新增待确认隐患记录 */
  batchCreateHazardPendingConfirmation: (payload: HazardPendingConfirmationCreateCommand[]) => Promise<HazardPendingConfirmationRecordVO[]>;

  /** AI识别隐患 */
  recognizeHazardsByAi: (payload: HazardAiRecognitionCommand) => Promise<HazardAiRecognitionVO>;

  /** 确认隐患属实 */
  confirmHazard: (id: string | number, payload: HazardConfirmCommand) => Promise<void>;

  /** 标记误报 */
  markHazardMisreport: (payload: HazardMisreportCommand) => Promise<void>;

  /** 催办整改任务 */
  urgeHazard: (id: string | number) => Promise<void>;

  /** 方案审批分页 */
  pageHazardApprovalTasks: (params: HazardApprovalTaskPageParams) => Promise<Pagination<HazardApprovalTaskPageVO>>;

  /** 查询审批详情 */
  getHazardApprovalTaskDetail: (taskId: string | number) => Promise<HazardApprovalDetailVO>;

  /** 审批通过 */
  approveHazardApprovalTask: (taskId: string | number, payload: HazardApprovalCommand) => Promise<void>;

  /** 审批退回 */
  rejectHazardApprovalTask: (taskId: string | number, payload: HazardApprovalCommand) => Promise<void>;

  /** 整改验收分页 */
  pageHazardAcceptanceTasks: (params: HazardAcceptanceTaskPageParams) => Promise<Pagination<HazardAcceptanceTaskPageVO>>;

  /** 查询验收详情 */
  getHazardAcceptanceDetail: (id: string | number) => Promise<HazardAcceptanceDetailVO>;

  /** 提交验收 */
  submitHazardAcceptance: (id: string | number) => Promise<void>;

  /** 验收判定 */
  acceptHazardAcceptance: (id: string | number, payload: HazardAcceptanceCommand) => Promise<void>;

  /** 整改任务分页 */
  pageHazardRectificationTasks: (params: HazardRectificationTaskPageParams) => Promise<Pagination<HazardRectificationTaskVO>>;

  /** 填写整改方案并提交审批 */
  submitHazardRectificationPlan: (id: string | number, payload: HazardRectificationPlanCommand) => Promise<string | number>;

  /** 查询最新整改进度详情 */
  getLatestHazardRectificationProgress: (id: string | number) => Promise<HazardRectificationProgressVO>;

  /** 新增整改进度 */
  createHazardRectificationProgress: (id: string | number, payload: HazardRectificationProgressCommand) => Promise<string | number>;

  /** 查询我的待办卡片统计 */
  getHazardTodoStatistics: (params?: Partial<HazardTodoPageParams>) => Promise<HazardTodoStatisticVO[]>;

  /** 查询我的待办列表 */
  pageHazardTodoItems: (params: HazardTodoPageParams) => Promise<Pagination<HazardTodoItemVO>>;

  /** 查询隐患看板总览 */
  getHazardDashboardSummary: (params?: HazardDashboardParams) => Promise<HazardDashboardSummaryVO>;

  /** 查询隐患看板图表 */
  getHazardDashboardCharts: (params?: HazardDashboardParams) => Promise<HazardDashboardChartsVO>;

  /** 查询隐患看板排行 */
  getHazardDashboardRankings: (params?: HazardDashboardRankingParams) => Promise<HazardDashboardRankingVO>;

  /** 屡改屡犯汇总 */
  getHazardRepeatedRectificationSummary: (
    params: HazardRepeatedRectificationSummaryParams,
  ) => Promise<HazardRepeatedRectificationSummaryVO>;

  /** 屡改屡犯分页 */
  pageHazardRepeatedRectifications: (
    params: HazardRepeatedRectificationPageParams,
  ) => Promise<Pagination<HazardRepeatedRectificationPageVO>>;

  /** 屡改屡犯详情 */
  getHazardRepeatedRectificationDetail: (params: HazardRepeatedRectificationDetailParams) => Promise<HazardRepeatedRectificationDetailVO>;

  /** 屡改屡犯裁定 */
  decideHazardRepeatedRectification: (id: string | number, payload: HazardRepeatedRectificationDecisionCommand) => Promise<void>;
}

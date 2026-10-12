export * from "./types";
export * from "./daily-task-type";

import type { PlatformContext } from "@g2-composition/contract";

interface HttpClient {
  get: (url: string) => Promise<unknown>;
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
  delete: (url: string) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

interface LegacyServiceError<T> {
  data?: T;
}
// 日常任务服务与旧项目一致，直接走网关的 /api 路径；不经过迁移期 BFF 转发层。
const BASE_API = "/api";

function withQuery(url: string, payload?: Record<string, unknown>): string {
  if (!payload) {
    return url;
  }
  const query = Object.entries(payload)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  return query ? `${url}${url.includes("?") ? "&" : "?"}${query}` : url;
}

class CubeGateway {
  public constructor(private readonly http: HttpClient) {}
  public async get<T>({ url, payload }: { url: string; payload?: Record<string, unknown> }): Promise<T> {
    return (await this.http.get(withQuery(url, payload))) as T;
  }
  public async create<T>({ url, payload }: { url: string; payload?: unknown }): Promise<T> {
    return (await this.http.post(url, payload)) as T;
  }
  public async update<T>({ url, payload }: { url: string; payload?: unknown }): Promise<T> {
    return (await this.http.put(url, payload)) as T;
  }
  public async delete({ url, payload }: { url: string; payload?: Record<string, unknown> }): Promise<void> {
    await this.http.delete(withQuery(url, payload));
  }
}

function unwrapLegacy<T>(value: T | { data?: T }): T {
  if (value && typeof value === "object" && "data" in value && (value as { data?: T }).data !== undefined) {
    return (value as { data: T }).data;
  }
  return value as T;
}

import type {
  PageResult,
  TaskResultModel,
  TaskUrgencyModel,
  TaskCategoryModel,
  TaskCycleModel,
  StandardItemModel,
  StandardModel,
  DailyPlanModel,
  DailyPlanDetailsModel,
  DailyTaskRecordModel,
  DailyTaskRecordDetailsModel,
  DailyRecordExceptionModel,
  DailyTaskRelateModel,
  StandardResultModel,
  BusinessTagModel,
  DailyTaskTarget,
  Statistics,
  TaskResultItem,
  TaskUrgencyItem,
  TaskListItem,
  TaskDetailModel,
  TaskObjectItem,
  TaskObjectListItem,
  TaskItemAllList,
  TaskSummaryModel,
  QrcodeEntityVO,
  TaskTargetVO,
  TaskFeedbackRecordVO,
} from "./types";

const tagBaseURL = `${BASE_API}/tag`;
const baseURL = `${BASE_API}/daily-task`;

/** 日常任务接口 */
export class CubeDailyTaskService {
  private readonly gateway: CubeGateway;
  public constructor(http: HttpClient) {
    this.gateway = new CubeGateway(http);
  }

  /** 日常任务结果分页查询 */
  public async getDailyTaskResultPage(payload: {
    dailyType: string;
    pageSize: number;
    pageNumber: number;
    name?: string | undefined;
    enable?: boolean | undefined;
  }): Promise<PageResult<TaskResultModel>> {
    const url = `${baseURL}/configuration/queryDailyResultPage`;
    const resp = await this.gateway.get<PageResult<TaskResultModel>>({ url, payload });
    return resp;
  }

  /** 日常任务结果新增 */
  public async addDailyTaskResult(payload: {
    name: string;
    enable: boolean;
    dailyType: string;
    resultLabelList: {
      label: string;
      errorFlag: boolean;
    }[];
  }): Promise<string> {
    const url = `${baseURL}/configuration/insertDailyResult`;
    const resp = await this.gateway.create<string>({ url, payload });
    return resp;
  }

  /** 日常任务结果删除 */
  public async deleteDailyTaskResult(id: string): Promise<void> {
    const url = `${baseURL}/configuration/deleteDailyResult/${id}`;
    const resp = await this.gateway.delete({ url });
    return resp;
  }

  /** 日常任务结果更新 */
  public async updateDailyTaskResult(payload: {
    id: string;
    name: string;
    enable: boolean;
    dailyType: string;
    resultLabelList: {
      label: string;
      value: string;
      errorFlag: boolean;
    }[];
  }): Promise<boolean> {
    const url = `${baseURL}/configuration/updateDailyResult`;
    const resp = await this.gateway.create<boolean>({ url, payload });
    return resp;
  }

  /** 紧急度分页查询 */
  public async getUrgencyPage(payload: {
    dailyType: string;
    pageSize: number;
    pageNumber: number;
    name?: string | undefined;
  }): Promise<PageResult<TaskUrgencyModel>> {
    const url = `${baseURL}/configuration/queryDailyUrgencyPage`;
    const resp = await this.gateway.get<PageResult<TaskUrgencyModel>>({ url, payload });
    return resp;
  }

  /** 紧急度新增 */
  public async addUrgency(payload: { name: string; level: number; dailyType: string }): Promise<string> {
    const url = `${baseURL}/configuration/insertDailyUrgency`;
    const resp = await this.gateway.create<string>({ url, payload });
    return resp;
  }

  /** 紧急度删除 */
  public async deleteUrgency(id: string): Promise<void> {
    const url = `${baseURL}/configuration/deleteDailyUrgency/${id}`;
    const resp = await this.gateway.delete({ url });
    return resp;
  }

  /** 紧急度更新 */
  public async updateUrgency(payload: { id: string; name: string; level: number; dailyType: string }): Promise<boolean> {
    const url = `${baseURL}/configuration/updateDailyUrgency`;
    const resp = await this.gateway.create<boolean>({ url, payload });
    return resp;
  }

  /** 任务类型分页查询 */
  public async getTaskCategoryPage(payload: {
    pageSize: number;
    pageNumber: number;
    dailyType: string;
    name?: string | undefined;
  }): Promise<PageResult<TaskCategoryModel>> {
    const url = `${baseURL}/configuration/queryDailyTaskCategoryPage`;
    const resp = await this.gateway.get<PageResult<TaskCategoryModel>>({ url, payload });
    return resp;
  }

  /** 任务类型新增 */
  public async addTaskCategory(payload: { name: string; dailyType: string }): Promise<string> {
    const url = `${baseURL}/configuration/insertDailyTaskCategory`;
    const resp = await this.gateway.create<string>({ url, payload });
    return resp;
  }

  /** 任务类型删除 */
  public async deleteTaskCategory(id: string): Promise<void> {
    const url = `${baseURL}/configuration/deleteDailyTaskCategory/${id}`;
    const resp = await this.gateway.delete({ url });
    return resp;
  }

  /** 任务类型更新 */
  public async updateTaskCategory(payload: { id: string; name: string; dailyType: string }): Promise<boolean> {
    const url = `${baseURL}/configuration/updateDailyTaskCategory`;
    const resp = await this.gateway.create<boolean>({ url, payload });
    return resp;
  }

  /** 查询任务周期分页 */
  public async getTaskCyclePage(payload: {
    dailyType: string;
    pageSize: number;
    pageNumber: number;
    name?: string | undefined;
  }): Promise<PageResult<TaskCycleModel>> {
    const url = `${baseURL}/configuration/queryDailyCronPage`;
    const resp = await this.gateway.get<PageResult<TaskCycleModel>>({ url, payload });
    return resp;
  }

  /** 新增任务周期 */
  public async addTaskCycle(payload: { dailyType: string; name: string; cron: string; description: string }): Promise<string> {
    const url = `${baseURL}/configuration/insertDailyCron`;
    const resp = await this.gateway.create<string>({ url, payload });
    return resp;
  }

  /** 更新任务周期 */
  public async updateTaskCycle(payload: {
    id: string;
    name: string;
    cron: string;
    dailyType: string;
    description: string;
  }): Promise<boolean> {
    const url = `${baseURL}/configuration/updateDailyCron`;
    const resp = await this.gateway.create<boolean>({ url, payload });
    return resp;
  }

  /** 批量删除任务周期 */
  public async batchDeleteTaskCycle(payload: { ids: string[] }): Promise<boolean> {
    const url = `${baseURL}/configuration/deleteDailyCron`;
    const resp = await this.gateway.create<boolean>({ url, payload });
    return resp;
  }

  /** 标准项分页 */
  public async getStandardItemPage(payload: {
    dailyType: string;
    pageSize: number;
    pageNumber: number;
    itemName?: string | undefined;
    targetType?: string | undefined;
  }): Promise<PageResult<StandardItemModel>> {
    const url = `${baseURL}/configuration/queryDailyItemResultRelationPage`;
    const resp = await this.gateway.get<PageResult<StandardItemModel>>({ url, payload });
    return resp;
  }

  /** 标准项新增 */
  public async addStandardItem(payload: {
    dailyType: string;
    itemName: string;
    itemContent: string;
    resultId: string;
    targetTypes?: string[];
    defaultResultItem?: string;
    mustTakePhotoResultItems?: string;
    mustRemarkResultItems?: string;
    tag?: string;
  }): Promise<string> {
    const url = `${baseURL}/configuration/insertDailyItemResultRelation`;
    const resp = await this.gateway.create<string>({ url, payload });
    return resp;
  }

  /** 标准项删除 */
  public async deleteStandardItem(id: string): Promise<void> {
    const url = `${baseURL}/configuration/deleteDailyItemResultRelation/${id}`;
    const resp = await this.gateway.delete({ url });
    return resp;
  }
  /**
   * 获取生成二维码实体
   * @param code
   * @returns
   */
  public async getEntityByCode(code: string): Promise<QrcodeEntityVO> {
    const url = `${BASE_API}/identity/qrcode/code?code=${encodeURIComponent(code)}`;
    const result = await this.gateway.get<LegacyServiceError<QrcodeEntityVO>>({ url });
    return (result.data ?? result) as QrcodeEntityVO;
  }
  /** 标准项更新 */
  public async updateStandardItem(payload: {
    dailyType: string;
    itemId: string;
    itemName: string;
    itemContent: string;
    resultId: string;
    targetTypes?: string[];
    defaultResultItem?: string;
    mustTakePhotoResultItems?: string;
    mustRemarkResultItems?: string;
    tag?: string;
  }): Promise<boolean> {
    const url = `${baseURL}/configuration/updateDailyItemResultRelation`;
    const resp = await this.gateway.create<boolean>({ url, payload });
    return resp;
  }

  /** 查询标准项结果关系 */
  public async getStandardItem(id: string): Promise<StandardItemModel> {
    const url = `${baseURL}/configuration/getDailyItemResultRelation/${id}`;
    const resp = await this.gateway.get<StandardItemModel>({ url });
    return resp;
  }

  /** 查询标准分页 */
  public async getDailyStandardPage(payload: {
    pageSize: number;
    pageNumber: number;
    dailyType: string;
    name?: string | undefined;
    categoryId?: string | undefined;
    enable?: boolean | undefined;
    targetType?: string | undefined;
  }): Promise<PageResult<StandardModel>> {
    const url = `${baseURL}/configuration/queryDailyStandardPage`;
    const resp = await this.gateway.get<PageResult<StandardModel>>({ url, payload });
    return resp;
  }

  /** 查询标准 */
  public async getDailyStandard(id: string): Promise<StandardModel> {
    const url = `${baseURL}/configuration/getDailyStandard/${id}`;
    const resp = await this.gateway.get<StandardModel>({ url });
    return resp;
  }

  /** 标准项新增 */
  public async addDailyStandard(payload: Record<string, unknown>): Promise<string> {
    const url = `${baseURL}/configuration/insertDailyStandard`;
    const resp = await this.gateway.create<string>({ url, payload });
    return resp;
  }

  /** 标准项删除 */
  public async deleteStandard(id: string): Promise<void> {
    const url = `${baseURL}/configuration/deleteDailyStandard/${id}`;
    const resp = await this.gateway.delete({ url });
    return resp;
  }

  /** 标准项更新 */
  public async updateDailyStandard(payload: Record<string, unknown>): Promise<string> {
    const url = `${baseURL}/configuration/updateDailyStandard`;
    const resp = await this.gateway.create<string>({ url, payload });
    return resp;
  }

  /** 标准项启用 */
  public async updateStandardEnable(payload: { id: string; enable: boolean }): Promise<string> {
    const url = `${baseURL}/configuration/updateDailyStandardStatus`;
    const resp = await this.gateway.create<string>({ url, payload });
    return resp;
  }

  /** 查询计划分页 */
  public async getDailyPlanPage(payload: {
    pageSize: number;
    pageNumber: number;
    dailyType: string;
    taskCategoryId?: string | undefined;
    urgencyId?: string | undefined;
    status?: string | undefined;
    name?: string | undefined;
    createTime?: string | undefined;
  }): Promise<PageResult<DailyPlanModel>> {
    const url = `${baseURL}/daily/plan/page`;
    const resp = await this.gateway.get<PageResult<DailyPlanModel>>({ url, payload });
    return resp;
  }

  /** 查询计划 */
  public async getDailyPlan(payload: { id: string }): Promise<DailyPlanDetailsModel> {
    const url = `${baseURL}/daily/plan/detail`;
    const resp = await this.gateway.get<DailyPlanDetailsModel>({ url, payload });
    return resp;
  }

  /** 添加计划 */
  public async addDailyPlan(payload: Record<string, unknown>): Promise<string> {
    const url = `${baseURL}/daily/plan/add`;
    const resp = await this.gateway.create<string>({ url, payload });
    return resp;
  }

  /** 计划启停 */
  public async updateDailyPlanEnable(payload: { id: string; enable: boolean }): Promise<boolean> {
    const url = `${baseURL}/daily/plan/enable`;
    const resp = await this.gateway.update<boolean>({ url, payload });
    return resp;
  }

  /** 更新计划 */
  public async updateDailyPlan(payload: Record<string, unknown>): Promise<string> {
    const url = `${baseURL}/daily/plan/edit`;
    const resp = await this.gateway.create<string>({ url, payload });
    return resp;
  }

  /** 删除计划 */
  public async deleteDailyPlan(payload: { id: string }): Promise<void> {
    const url = `${baseURL}/daily/plan/remove`;
    const resp = await this.gateway.delete({ url, payload });
    return resp;
  }

  /** 任务分页查询 */
  // public async getDailyTaskPage (payload: {
  //   pageSize: number;
  //   pageNumber: number;
  //   dailyType?: string | undefined;
  //   taskCategoryId?: string | undefined;
  //   urgencyId?: string | undefined;
  //   status?: string | undefined;
  //   keyword?: string | undefined;
  //   period?: string | undefined;
  // }): Promise<PageResult<DailyTaskModel>> {
  //   const url = `${baseURL}/daily/task/page`
  //   const resp = await this.gateway.get<PageResult<DailyTaskModel>>({ url, payload })
  //   return resp
  // }

  /** 查询任务详情 */
  // public async getDailyTaskDetail (payload: {
  //   id: string;
  // }): Promise<DailyTaskDetailsModel> {
  //   const url = `${baseURL}/daily/task/detail`
  //   const resp = await this.gateway.get<DailyTaskDetailsModel>({ url, payload })
  //   return resp
  // }

  /** 查询任务对象信息 */
  public async getDailyTaskTargets(payload: { taskId: string }): Promise<Record<string, DailyTaskTarget[]>> {
    const url = `${baseURL}/daily/task/relate/app`;
    const resp = await this.gateway.get<Record<string, DailyTaskTarget[]>>({ url, payload });
    return resp;
  }

  /** 查询任务对象信息 */
  public async getPCDailyTaskTargets(payload: { taskId: string }): Promise<DailyTaskTarget[]> {
    const url = `${baseURL}/daily/task/relate/pc`;
    const resp = await this.gateway.get<DailyTaskTarget[]>({ url, payload });
    return resp;
  }

  /** 任务添加 */
  public async addDailyTask(payload: Record<string, unknown>): Promise<string> {
    const url = `${baseURL}/daily/task/add`;
    const resp = await this.gateway.create<string>({ url, payload });
    return resp;
  }

  /** 保存草稿箱 */
  public async saveDraft(payload: Record<string, unknown>): Promise<string> {
    const url = `${baseURL}/daily/task/edit`;
    const resp = await this.gateway.create<string>({ url, payload });
    return resp;
  }

  /** 任务删除 */
  public async deleteDailyTask(id: string): Promise<void> {
    const url = `${baseURL}/daily/task/delete/${id}`;
    return await this.gateway.delete({ url });
  }

  /** 根据任务id获取任务关联对象信息 */
  public async getDailyTaskRelatePage(payload: {
    pageSize: number;
    pageNumber: number;
    taskId: string;
    result?: string | undefined;
    targetType?: string | undefined;
    status?: string | undefined;
    keyword?: string | undefined;
    executeTime?: string | undefined;
    allowAssign?: boolean | undefined;
  }): Promise<PageResult<DailyTaskRelateModel>> {
    const url = `${baseURL}/daily/task/relate`;
    const resp = await this.gateway.get<PageResult<DailyTaskRelateModel>>({ url, payload });
    return resp;
  }

  /** 批量查询标准 */
  public async getDailyStandardByTypeIds(payload: { typeIds: string[]; type?: string; dailyType?: string }): Promise<
    Record<
      string,
      {
        id: string;
        typeId: string;
        name: string;
        description: string;
      }[]
    >
  > {
    const url = `${baseURL}/configuration/getStandardByTypeIds`;
    const resp = await this.gateway.create<
      Record<
        string,
        {
          id: string;
          typeId: string;
          name: string;
          description: string;
        }[]
      >
    >({ url, payload });
    return resp;
  }

  /** 根据任务类型获取标准 */
  public async getDailyStandardByTaskTypeId(taskTypeId: string): Promise<StandardModel[]> {
    const url = `${baseURL}/configuration/getDailyStandard/taskTypeId/${taskTypeId}`;
    const resp = await this.gateway.get<StandardModel[]>({ url });
    return resp;
  }

  /** 记录分页列表 */
  public async getDailyTaskRecordPage(payload: {
    pageSize: number;
    pageNumber: number;
    dailyType: string;
    keyword?: string | undefined;
    status?: string | undefined;
    taskCategoryId?: string | undefined;
    taskName?: string | undefined;
    executionTime?: string | undefined;
    executionResult?: string | undefined;
    recordStatus?: string | undefined;
    recordStatuses?: string[] | undefined;
  }): Promise<PageResult<DailyTaskRecordModel>> {
    const recordUrlMap: Record<string, string> = {
      GRID_MANAGE: `${baseURL}/daily/record/grid`,
      DAILY_INSPECTION: `${baseURL}/daily/record/inspect`,
    };
    const url = recordUrlMap[payload.dailyType] || `${baseURL}/daily/record/page`;
    const resp = await this.gateway.get<PageResult<DailyTaskRecordModel>>({ url, payload });
    return resp;
  }

  /** 获取记录详情 */
  public async getDailyTaskRecordDetail(payload: { id: string; taskId?: string; targetId?: string }): Promise<DailyTaskRecordDetailsModel> {
    const url = `${baseURL}/daily/record/detail`;
    const resp = await this.gateway.get<DailyTaskRecordDetailsModel>({ url, payload });
    return resp;
  }

  /** 获取记录异常修复详情 */
  public async getDailyTaskRepairDetail(payload: { exceptionId: string }): Promise<DailyRecordExceptionModel> {
    const url = `${baseURL}/daily/record/repair/detail`;
    const resp = await this.gateway.get<DailyRecordExceptionModel>({ url, payload });
    return resp;
  }

  /** 提交记录异常修复结果 */
  public async submitDailyTaskRepair(payload: {
    exceptionId: string;
    executionResult: "NORMAL" | "ABNORMAL";
    remark?: string;
    fileIds: string[];
  }): Promise<boolean> {
    const url = `${baseURL}/daily/record/repair/submit`;
    const resp = await this.gateway.create<boolean>({ url, payload });
    return resp;
  }

  /** 移交记录异常修复 */
  public async transferDailyTaskRepair(payload: { exceptionId: string; repairUserId: string }): Promise<boolean> {
    const url = `${baseURL}/daily/record/repair/transfer`;
    const resp = await this.gateway.create<boolean>({ url, payload });
    return resp;
  }

  /** 获取记录目标详情 */
  public async getDailyTaskRecordTargetDetail(payload: { id?: string; taskId?: string; targetId?: string }): Promise<StandardResultModel> {
    const url = `${baseURL}/daily/record/target-detail`;
    const resp = await this.gateway.get<StandardResultModel>({ url, payload });
    return resp;
  }

  /**
   * 查询执行结果标准
   */
  public async getDailyResultPage(payload: {
    pageNumber: string;
    pageSize: string;
    dailyType: string;
  }): Promise<PageResult<TaskResultItem>> {
    const url = `${baseURL}/configuration/queryDailyResultPage`;
    const resp = await this.gateway.get<PageResult<TaskResultItem>>({ url, payload });
    return resp;
  }

  /**
   * 查询紧急程度
   */
  public async getDailyUrgencyPage(payload: {
    pageNumber: string;
    pageSize: string;
    dailyType: string;
  }): Promise<PageResult<TaskUrgencyItem>> {
    const url = `${baseURL}/configuration/queryDailyUrgencyPage`;
    const resp = await this.gateway.get<PageResult<TaskUrgencyItem>>({ url, payload });
    return resp;
  }
  /**
   * 查询任务类型
   */
  public async getDailyTaskCategoryPage(payload: {
    pageNumber: string;
    pageSize: string;
    dailyType: string;
  }): Promise<PageResult<TaskUrgencyItem>> {
    const url = `${baseURL}/configuration/queryDailyTaskCategoryPage`;
    const resp = await this.gateway.get<PageResult<TaskUrgencyItem>>({ url, payload });
    return resp;
  }
  /**
   * 查询日常任务
   */
  public async getDailyTaskPage(payload: {
    pageNumber: number;
    pageSize: number;
    dailyType: string;
    taskCategoryId: string;
    keyword: string;
    status: string;
    urgencyId?: string;
    queryType?: string;
    period?: string;
    objectId?: string;
  }): Promise<PageResult<TaskListItem>> {
    const url = `${baseURL}/daily/task/page`;
    const resp = await this.gateway.get<PageResult<TaskListItem>>({ url, payload });
    return resp;
  }
  /**
   * 获取对象信息
   */
  public async getDailyTaskObject(payload: { taskId: string; id: string }): Promise<DailyTaskTarget> {
    const url = `${baseURL}/daily/task/target/relate`;
    const resp = await this.gateway.get<DailyTaskTarget>({ url, payload });
    return resp;
  }

  /**
   * 查询网格任务
   */
  public async getGridTaskPage(payload: {
    pageNumber: number;
    pageSize: number;
    dailyTypes: string;
    taskCategoryId: string;
    keyword: string;
    status: string;
    urgencyId?: string;
    queryType?: string;
    period?: string;
  }): Promise<PageResult<TaskListItem>> {
    const url = `${baseURL}/daily/task/page/grid`;
    const resp = await this.gateway.get<PageResult<TaskListItem>>({ url, payload });
    return resp;
  }
  /**
   * 查询小散工程
   */
  public async getDailySmallPage(payload: {
    pageNumber: number;
    pageSize: number;
    dailyType: string;
    taskCategoryId: string;
    keyword: string;
    status: string;
    urgencyId?: string;
    queryType?: string;
    period?: string;
  }): Promise<PageResult<TaskListItem>> {
    const url = `${baseURL}/daily/task/page/small-inspection`;
    const resp = await this.gateway.get<PageResult<TaskListItem>>({ url, payload });
    return resp;
  }
  /**
   * 查询巡检任务
   */
  public async getDailyInspectTaskPage(payload: {
    pageNumber: number;
    pageSize: number;
    dailyType: string;
    taskCategoryId: string;
    keyword: string;
    status: string;
    urgencyId?: string;
    queryType?: string;
    period?: string;
  }): Promise<PageResult<TaskListItem>> {
    const url = `${baseURL}/daily/task/page/inspect`;
    const resp = await this.gateway.get<PageResult<TaskListItem>>({ url, payload });
    return resp;
  }
  /**
   * 查询巡查任务
   */
  public async getDailySmallInspectionTaskPage(payload: {
    pageNumber: number;
    pageSize: number;
    dailyType: string;
    taskCategoryId: string;
    keyword: string;
    status: string;
    urgencyId?: string;
    queryType?: string;
    period?: string;
  }): Promise<PageResult<TaskListItem>> {
    const url = `${baseURL}/daily/task/page/small-inspection`;
    const resp = await this.gateway.get<PageResult<TaskListItem>>({ url, payload });
    return resp;
  }
  /**
   * 新增任务
   */
  public async createDailyTaskPage(payload: {
    dailyType: string;
    taskCategoryId: string;
    urgencyId: string;
    taskDay: number;
    taskHour: number;
    taskMinute: number;
    description: string;
    fileIds: string[];
    participateList: {
      participateType: string;
      targetId: string;
    }[];
    taskItemIdList?: number[];
    targetResultList?: {
      targetCategory: string;
      targetId: string;
      // standardList:string[]
    }[];
    name: string;
    continuity?: boolean;
    isOnDuty?: boolean;
    method?: string | null;
    requireProgress?: number | null;
  }): Promise<boolean> {
    const url = `${baseURL}/daily/task/add`;
    const resp = await this.gateway.create<boolean>({ url, payload });
    return resp;
  }

  /** 终止任务 */
  public async terminateDailyTask(id: string): Promise<boolean> {
    const url = `${baseURL}/daily/task/terminate/${id}`;
    const resp = await this.gateway.create<boolean>({ url });
    return resp;
  }

  /**
   * 移交任务
   */
  public async transferDailyTask(payload: {
    taskId?: string;
    taskIdList: string[];
    transferUserId: string;
    dailyType: string;
  }): Promise<boolean> {
    const url = `${baseURL}/daily/task/transfer`;
    const resp = await this.gateway.create<boolean>({ url, payload });
    return resp;
  }

  // /**
  //  * 任务详情
  //  */
  public async getDailyTaskDetail(payload: { id: string }): Promise<TaskDetailModel> {
    const url = `${baseURL}/daily/task/detail`;
    const resp = await this.gateway.get<TaskDetailModel>({ url, payload });
    return resp;
  }

  /** 持续性任务反馈提交 */
  public async dailyTaskFeedback(payload: {
    taskId: string | number;
    schedule: number;
    description?: string;
    files?: string;
  }): Promise<boolean> {
    const url = `${baseURL}/daily/task/feedback`;
    const resp = await this.gateway.create<boolean>({ url, payload });
    return resp;
  }

  /** 持续性任务反馈记录列表 */
  public async getDailyTaskFeedbackList(payload: { taskId: string }): Promise<TaskFeedbackRecordVO[]> {
    const url = `${baseURL}/daily/task/feedback/list`;
    const resp = await this.gateway.get<TaskFeedbackRecordVO[]>({ url, payload });
    return resp ?? [];
  }

  /**
   * 查询设备对象
   */
  public async getDevicePage(payload: {
    pageNumber: string;
    pageSize: string;
    tagId?: string;
    ids?: string[];
    name?: string;
    anyMatchedAreaId?: string;
    deptId?: string;
  }): Promise<PageResult<TaskObjectItem>> {
    const url = `${tagBaseURL}/business-tag/ref/device`;
    const resp = await this.gateway.create<PageResult<TaskObjectItem>>({ url, payload });
    return resp;
  }
  /**
   * 条件查询设备所有对象ID
   */
  public async getDevicePageID(payload: { tagId: string; name: string; deptId: string }): Promise<string[]> {
    const url = `${tagBaseURL}/business-tag/ref/device/idTypes`;
    const resp = await this.gateway.create<string[]>({ url, payload });
    return resp;
  }
  /**
   * 查询档位对象
   */
  public async getStallPage(payload: {
    pageNumber: string;
    pageSize: string;
    tagId?: string;
    ids?: string[];
    name?: string;
    deptId?: string;
    areaId?: string;
  }): Promise<PageResult<TaskObjectItem>> {
    const url = `${tagBaseURL}/business-tag/ref/stall`;
    const resp = await this.gateway.create<PageResult<TaskObjectItem>>({ url, payload });
    return resp;
  }

  /** 获取标签树列表 */
  public async getTagTreeList(payload: { name?: string | undefined; period?: string | undefined }): Promise<BusinessTagModel[]> {
    const url = `${tagBaseURL}/business-tag/tree`;
    const resp = await this.gateway.get<BusinessTagModel[]>({ url, payload });
    return resp || [];
  }

  /**
   * 条件查询档位所有对象ID
   */
  public async getStallPageID(payload: { tagId: string; name: string; deptId: string }): Promise<string[]> {
    const url = `${tagBaseURL}/business-tag/ref/stall/idTypes`;
    const resp = await this.gateway.create<string[]>({ url, payload });
    return resp;
  }

  /**
   * 查询资产对象
   */
  public async getPropertyPage(payload: {
    pageNumber: string;
    pageSize: string;
    tagId?: string;
    ids?: string[];
    name?: string;
    deptId?: string;
  }): Promise<PageResult<TaskObjectItem>> {
    const url = `${tagBaseURL}/business-tag/ref/property-detailed`;
    const resp = await this.gateway.create<PageResult<TaskObjectItem>>({ url, payload });
    return resp;
  }
  /**
   * 条件查询资产所有对象ID
   */
  public async getPropertyPageID(payload: { tagId: string; name: string; deptId: string }): Promise<string[]> {
    const url = `${tagBaseURL}/business-tag/ref/property-detailed/idTypes`;
    const resp = await this.gateway.create<string[]>({ url, payload });
    return resp;
  }

  /**
   * 查询现场点对象
   */
  public async getScenePointPage(payload: {
    pageNumber: string;
    pageSize: string;
    tagId?: string;
    ids?: string[];
    name?: string;
    deptId?: string;
  }): Promise<PageResult<TaskObjectItem>> {
    const url = `${tagBaseURL}/business-tag/ref/scene-point`;
    const resp = await this.gateway.create<PageResult<TaskObjectItem>>({ url, payload });
    return resp;
  }
  /**
   * 条件查询现场点所有对象ID
   */
  public async getScenePointPageID(payload: { tagId: string; name: string; deptId: string }): Promise<string[]> {
    const url = `${tagBaseURL}/business-tag/ref/scene-point/idTypes`;
    const resp = await this.gateway.create<string[]>({ url, payload });
    return resp;
  }
  /**
   * 查询巡更点对象
   */
  public async getPatrolPointPage(payload: {
    pageNumber: string;
    pageSize: string;
    tagId?: string;
    ids?: string[];
    name?: string;
    deptId?: string;
    areaId?: string;
  }): Promise<PageResult<TaskObjectItem>> {
    const url = `${tagBaseURL}/business-tag/ref/patrol-point`;
    const resp = await this.gateway.create<PageResult<TaskObjectItem>>({ url, payload });
    return resp;
  }
  /**
   * 条件查询巡更点所有对象ID
   */
  public async getPatrolPointPageID(payload: { tagId: string; name: string; deptId: string }): Promise<string[]> {
    const url = `${tagBaseURL}/business-tag/ref/patrol-point/idTypes`;
    const resp = await this.gateway.create<string[]>({ url, payload });
    return resp;
  } /**
   * 查询风险点对象
   */
  public async getRiskPage(payload: {
    pageNumber: string;
    pageSize: string;
    tagId: string;
    ids: string[];
    name: string;
    deptId: string;
  }): Promise<PageResult<TaskObjectItem>> {
    const url = `${tagBaseURL}/business-tag/ref/risk-source`;
    const resp = await this.gateway.create<PageResult<TaskObjectItem>>({ url, payload });
    return resp;
  }
  /**
   * 条件查询风险点所有对象ID
   */
  public async getRiskPageID(payload: { tagId: string; name: string; deptId: string }): Promise<string[]> {
    const url = `${tagBaseURL}/business-tag/ref/risk-source/idTypes`;
    const resp = await this.gateway.create<string[]>({ url, payload });
    return resp;
  }
  /**
   * 查询小散对象
   */
  public async getProjectPage(payload: {
    pageNumber: string;
    pageSize: string;
    tagId: string;
    ids: string[];
    name: string;
    deptId: string;
  }): Promise<PageResult<TaskObjectItem>> {
    const url = `${tagBaseURL}/business-tag/ref/project-schedule`;
    const resp = await this.gateway.create<PageResult<TaskObjectItem>>({ url, payload });
    return resp;
  }
  /**
   * 条件查询小散所有对象ID
   */
  public async getProjectPageID(payload: { tagId: string; name: string; deptId: string }): Promise<string[]> {
    const url = `${tagBaseURL}/business-tag/ref/project-schedule/idTypes`;
    const resp = await this.gateway.create<string[]>({ url, payload });
    return resp;
  }
  /**
   * 查询区域树对象
   */
  public async getAreaTreePage(payload: {
    pageNumber: string;
    pageSize: string;
    tagId: string;
    ids: string[];
    name: string;
    deptId: string;
  }): Promise<PageResult<TaskObjectItem>> {
    const url = `${baseURL}/business-tag/ref/area`;
    const resp = await this.gateway.create<PageResult<TaskObjectItem>>({ url, payload });
    return resp;
  }
  /**
   * 条件查询区域树所有对象ID
   */
  public async getAreaTreePageID(payload: { tagId: string; name: string; deptId: string }): Promise<string[]> {
    const url = `${baseURL}/business-tag/ref/area/idTypes`;
    const resp = await this.gateway.create<string[]>({ url, payload });
    return resp;
  }
  /**
   * 查询巡检标准项
   */
  public async getResultRelation(payload: { pageNumber: string; pageSize: string; dailyType: string }): Promise<
    PageResult<{
      itemId: number;
      itemName: string;
      checked: boolean;
    }>
  > {
    const url = `${baseURL}/configuration/queryDailyItemResultRelationPage`;
    const resp = await this.gateway.get<
      PageResult<{
        itemId: number;
        itemName: string;
        checked: boolean;
      }>
    >({ url, payload });
    return resp;
  }

  /**
   * 新增执行标准项
   */
  public async addDailyItemResultRelation(payload: {
    itemName: string;
    itemContent: string;
    resultId: string;
    defaultResultItem: string;
    mustTakePhotoResultItems: string;
    mustRemarkResultItems: string;
    dailyType: string;
  }): Promise<boolean> {
    const url = `${baseURL}/configuration/insertDailyItemResultRelation`;
    const resp = await this.gateway.create<boolean>({ url, payload });
    return resp;
  }

  /**
   * 校验有标准的对象
   */
  public async getTargetIdsByTypeIds(payload: {
    targets: {
      id: string;
      typeId: string;
    }[];
  }): Promise<{
    removeCount: number;
    targets: { id: string; typeId: string }[];
  }> {
    const url = `${baseURL}/configuration/getTargetIdsByTypeIds`;
    const resp = await this.gateway.create<{
      removeCount: number;
      targets: { id: string; typeId: string }[];
    }>({ url, payload });
    return resp;
  }
  /**
   * 根据id获取任务关联对象
   */
  public async getRelateformId(payload: {
    pageNumber: string;
    pageSize: string;
    taskId: string;
    dailyType: string;
    keyword?: string;
    result?: string;
    status?: string;
    tagId?: string;
  }): Promise<PageResult<TaskObjectListItem>> {
    const url = `${baseURL}/daily/task/relate`;
    const resp = await this.gateway.get<PageResult<TaskObjectListItem>>({ url, payload });
    return resp;
  }
  /**
   * 获取当前任务还能分发的百分比数
   */
  public async getRelatePercent(payload: { taskId: string }): Promise<number> {
    const url = `${baseURL}/daily/task/percent`;
    const resp = await this.gateway.get<number>({ url, payload });
    return resp;
  }

  /**
   * 指派任务
   */
  public async distributeDailyTask(payload: {
    taskId: string;
    transferUserId: string;
    taskTargetIdList?: string[];
    dailyType: string;
    taskPercent?: string;
  }): Promise<boolean> {
    const url = `${baseURL}/daily/task/distribute`;
    const resp = await this.gateway.create<boolean>({ url, payload });
    return resp;
  }

  /**
   * 按百分比分发任务
   */
  public async distributeDailyTaskByPercent(payload: {
    taskId: string;
    dailyType: string;
    assignUserParams?: { userId: string; taskPercent: number }[];
  }): Promise<boolean> {
    const url = `${baseURL}/daily/task/assign`;
    const resp = await this.gateway.create<boolean>({ url, payload });
    return resp;
  }

  /**
   * 处理任务
   */
  public async dailyTaskSubmit(payload: {
    dailyType: string;
    taskId: string;
    taskName: string;
    recordItemList?:
      | {
          dailyType: string;
          taskId: string;
          taskName: string;
          itemId: string;
          itemName: string;
          itemTag: string;
          resultId: string;
          resultName: string;
          errorFlag: boolean;
          remark: string;
          fileIdList: string[];
          defaultResultItem: string;
          mustTakePhotoResultItems: string;
          mustRemarkResultItems: string;
        }[]
      | undefined;
    recordTargetList?:
      | {
          targetId: string | undefined;
          targetItemList: {
            standardId: string;
            standardName: string;
          }[];
          otherTargetIdList?: string[];
        }[]
      | null;
    remark?: string;
    fileIds?: string[];
  }): Promise<boolean> {
    const url = `${baseURL}/daily/record/submit`;
    const resp = await this.gateway.create<boolean>({ url, payload });
    return resp;
  }
  /**
   * 获取对象的标准
   */
  public async getTargetFormObj(payload: { id: string; taskId: string }): Promise<TaskItemAllList[]> {
    const url = `${baseURL}/daily/task/target`;
    const resp = await this.gateway.get<TaskItemAllList[]>({ url, payload });
    return resp;
  }

  /** 保存草稿箱h5 */
  public async saveDraftH5(payload: {
    dailyType: string;
    taskCategoryId: string;
    urgencyId: string;
    taskDay: number;
    taskHour: number;
    taskMinute: number;
    description: string;
    fileIds: string[];
    participateList: {
      participateType: string;
      targetId: string;
    }[];
    taskItemIdList?: number[];
    targetResultList?: {
      targetCategory: string;
      targetId: string;
      // standardList:string[]
    }[];
    name: string;
    continuity?: boolean;
  }): Promise<string> {
    const url = `${baseURL}/daily/task/edit`;
    const resp = await this.gateway.create<string>({ url, payload });
    return resp;
  }
  /** 草稿箱h5获取对象 */
  public async getRecordFormId(payload: { taskId: string; dailyType: string }): Promise<string> {
    const url = `${baseURL}/daily/task/relate/app`;
    const resp = await this.gateway.get<string>({ url, payload });
    return resp;
  }
  /** 日常任务统计 */
  public async getStatistics(payload: { type: string; period: string; dailyType: string }): Promise<Statistics> {
    const url = `${baseURL}/daily/task/statistics`;
    const resp = await this.gateway.get<Statistics>({ url, payload });
    return resp;
  }
  /* 关联工单 */
  public async linkWork(payload: {
    taskId?: string;
    recordId?: string;
    targetId: string;
    workOrderType: string;
    processInstanceId: string;
    processInstanceName: string;
  }): Promise<Statistics> {
    const url = `${baseURL}/daily/work-order/link`;
    const resp = await this.gateway.create<Statistics>({ url, payload });
    return resp;
  }
  /* 任务执行进度汇总 */
  public async getTaskSummary(payload: { taskId: string }): Promise<TaskSummaryModel> {
    const url = `${baseURL}/daily/task/summary`;
    const resp = await this.gateway.get<TaskSummaryModel>({ url, payload });
    return resp;
  }
  /* 任务下对象包含的标签 */
  public async getTaskTags(payload: { taskId: string }): Promise<string[]> {
    const url = `${baseURL}/daily/task/tags`;
    const resp = await this.gateway.get<string[]>({ url, payload });
    return resp;
  }
  /* 任务提交 */
  public async taskSubmit(payload: { taskId: string; dailyType: string }): Promise<boolean> {
    const url = `${baseURL}/daily/task/submit`;
    const resp = await this.gateway.create<boolean>({ url, payload });
    return resp;
  }

  /** 获取其他档位列表 */
  public async getOtherTargets(payload: {
    taskId?: number | string;
    targetId?: number | string;
    itemIdList?: number[] | string[];
  }): Promise<TaskTargetVO[]> {
    const url = `${baseURL}/daily/task/other/target`;
    const resp = await this.gateway.create<TaskTargetVO[]>({ url, payload });
    return resp;
  }

  // daily-task 页面依赖的相邻服务面。仍由本 Client 持有路径/解包，Domain 不直连 HTTP。
  public async getAreaTree(): Promise<unknown[]> {
    return unwrapLegacy(await this.gateway.get({ url: `${BASE_API}/mdata/area/list` }));
  }
  public async stallTypeList(payload: { enabled?: boolean }): Promise<unknown[]> {
    return unwrapLegacy(await this.gateway.get({ url: `${BASE_API}/mdata/stall-category/list`, payload }));
  }
  public async getMessageConfig(payload: { businessType: string; label?: string }): Promise<unknown[]> {
    return this.gateway.get({ url: `${BASE_API}/bracing/message/getConfigInfo`, payload });
  }
  public async addMessageConfig(payload: Record<string, unknown>): Promise<string> {
    return this.gateway.create({ url: `${BASE_API}/bracing/message/addConfig`, payload });
  }
  public async sceneNotificationMethod(code: string): Promise<{ value: string; label: string }[]> {
    const channels = await this.gateway.get<{ channelCode: string; channelName: string }[]>({
      url: `${BASE_API}/message2/sat-msg-channels`,
    });
    const selected = await this.gateway.get<{ channelCodes?: string[] }>({
      url: `${BASE_API}/message2/sat-msg-scene-receive/code/${code}`,
    });
    return channels
      .filter((item) => selected.channelCodes?.includes(item.channelCode))
      .map((item) => ({ label: item.channelName, value: item.channelCode }));
  }
  public async getProjectTypeList(payload?: { name?: string }): Promise<unknown[]> {
    return unwrapLegacy(await this.gateway.get({ url: `${BASE_API}/loose-works/project-type/list`, payload }));
  }
  public async getIotProductCategoryTree(): Promise<unknown[]> {
    return unwrapLegacy(await this.gateway.get({ url: `${BASE_API}/device-center/iot/product/category-tree` }));
  }
  public async getAssemblyClassifyPage(payload: Record<string, unknown>): Promise<unknown> {
    return unwrapLegacy(await this.gateway.get({ url: `${BASE_API}/property/classify/getAssemblyClassifyPage`, payload }));
  }
  public async getType(payload: Record<string, unknown>): Promise<unknown> {
    return this.gateway.get({ url: `${BASE_API}/dictionary/getCascadeDictionaryItem`, payload });
  }
  public async inspectPointTypeList(): Promise<unknown[]> {
    return unwrapLegacy(await this.gateway.get({ url: `${BASE_API}/maintain/inspect/sceneTypeList` }));
  }
  public async getTagAreaTreeList(payload: Record<string, unknown>): Promise<unknown[]> {
    return this.gateway.create({ url: `${BASE_API}/tag/business-tag/ref/area`, payload });
  }
  public async getTagStallPageList(payload: Record<string, unknown>): Promise<unknown> {
    return this.gateway.create({ url: `${BASE_API}/tag/business-tag/ref/stall`, payload });
  }
  public async getTagDevicePageList(payload: Record<string, unknown>): Promise<unknown> {
    return this.gateway.create({ url: `${BASE_API}/tag/business-tag/ref/device`, payload });
  }
  public async getTagSitePointPageList(payload: Record<string, unknown>): Promise<unknown> {
    return this.gateway.create({ url: `${BASE_API}/tag/business-tag/ref/scene-point`, payload });
  }
  public async getTagPropertyPageList(payload: Record<string, unknown>): Promise<unknown> {
    return this.gateway.create({ url: `${BASE_API}/tag/business-tag/ref/property-detailed`, payload });
  }
  public async getTagRiskSourcePageList(payload: Record<string, unknown>): Promise<unknown> {
    return this.gateway.create({ url: `${BASE_API}/tag/business-tag/ref/risk-source`, payload });
  }
  public async getTagSmallEngineeringPageList(payload: Record<string, unknown>): Promise<unknown> {
    return this.gateway.create({ url: `${BASE_API}/tag/business-tag/ref/project-schedule`, payload });
  }
  public async getTagPatrolPointPageList(payload: Record<string, unknown>): Promise<unknown> {
    return this.gateway.create({ url: `${BASE_API}/tag/business-tag/ref/patrol-point`, payload });
  }
}

export type DailyTaskClient = CubeDailyTaskService;

/** MF ./client 入口：自持 httpPlatform 传输编排。 */
export async function create(ctx: PlatformContext): Promise<DailyTaskClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return new CubeDailyTaskService(httpModule.createHttpClientForPlatform(ctx));
}

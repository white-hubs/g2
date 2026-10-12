/** 通用分页 */
export interface PageResult<T> {
  pages: number;
  records: T[];
  total: number;
}
export interface OSSFile {
  businessKey: string | null;
  id: string;
  name: string;
  path: string;
  refCount: number;
  size: number;
  suffix: string;
  type: string;
  createTime?: string;
}
export interface TaskResultModel {
  id: string;
  name: string;
  enable: boolean;
  createTime: string;
  updateTime: string;
  resultLabelList: TaskResultItemModel[];
}

export interface TaskResultItemModel {
  label: string;
  value: string;
  errorFlag: boolean;
}

export interface TaskUrgencyModel {
  id: string;
  name: string;
  level: number;
  createTime: string;
  updateTime: string;
}

export interface TaskCategoryModel {
  id: string;
  name: string;
  createTime: string;
  updateTime: string;
}

export interface TaskCycleModel {
  id: string;
  name: string;
  cron: string;
  description: string;
  createTime: string;
  updateTime: string;
}

export interface StandardItemModel {
  itemId: string;
  itemName: string;
  targetTypes: string[];
  itemContent: string;
  operationGuide: string;
  resultId: string;
  resultName: string;
  resultLabelList: TaskResultItemModel[];
  defaultResultItem: string;
  mustTakePhotoResultItems: string;
  mustRemarkResultItems: string;
  tag: string;
  createTime: string;
  updateTime: string;
  executeResult: {
    record: string;
    itemId: string;
    itemName: string;
    resultId: string;
    resultName: string;
    errorFlag: boolean;
    remark: string;
    fileList: OSSFile[];
  };
  dailyType?: string;
}

export interface StandardModel {
  id: string;
  name: string;
  description: string;
  categoryIds: string;
  categoryNames: string;
  enable: boolean;
  targetTypeRelationStr: string;
  targetTypeRelations: {
    type: string;
    targetTypeId: string;
  }[];
  items: StandardItemModel[];
}

export interface DailyPlanModel {
  id: string;
  dailyType: string;
  planName: string;
  taskCategoryId: string;
  taskCategoryName: string;
  status: string;
  createTime: string;
  startTime: string;
  endTime: string;
  executionCount: number;
  urgencyName: string;
  createByName: string;
  targetCount: number;
  enable: boolean;
  superintendentList: {
    id: string;
    planId: string;
    superintendentType: string;
    targetId: string;
    targetName: string;
  }[];
}

export interface DailyPlanDetailsModel {
  id: string;
  dailyType: string;
  taskType: string;
  name: string;
  status: string;
  createBy: string;
  createByName: string;
  createTime: string;
  startTime: string;
  endTime: string;
  lastTime: string;
  nextTime: string;
  taskCategoryId: string;
  taskCategoryName: string;
  cronId: string;
  cronName: string;
  urgencyId: string;
  urgencyName: string;
  executeWay: string;
  specifiedType: string;
  specifiedDays: string;
  specifiedTime: string;
  executionCount: number;
  taskDay: number;
  taskHour: number;
  taskMinute: number;
  description: string;
  fileList: OSSFile[];
  superintendentType: string;
  participateList: ParticipateItem[];
  standardList: TargetStandard[];
  taskItemList: StandardRetItem[];
  targetTypeResultMap: Record<string, DailyTaskTarget[]>;
  isOnDuty: boolean;
  method: string;
  requireProgress: number;
}

export interface ParticipateItem {
  conditionType: "USER" | "CONDITION";
  participateParams: ParticipateModel[];
  abnormalUserList: ParticipateModel[];
}

export interface ParticipateModel {
  participateType: string;
  targetId: string;
  targetName: string;
}

export interface TargetStandard {
  id: string;
  name: string;
  description: string;
  itemList?: {
    id: string;
    name: string;
    content: string;
    tag: string;
    resultList: {
      id: string;
      name: string;
      defaultResultItem: string;
      mustTakePhotoResultItems: string;
      mustRemarkResultItems: string;
      resultLabelJson: string;
    }[];
  }[];
  createTime?: string;
}

export interface StandardRetItem {
  id: string;
  name: string;
  content: string;
  operationGuide?: string;
  tag: string;
  resultList: {
    id: string;
    name: string;
    defaultResultItem: string;
    mustTakePhotoResultItems: string;
    mustRemarkResultItems: string;
    resultLabelJson: string;
  }[];
  executeResult?: {
    record: string;
    itemId: string;
    itemName: string;
    resultId: string;
    resultName: string;
    errorFlag: boolean;
    remark: string;
    fileList: OSSFile[];
  };
}

export interface OptionItem {
  id: string;
  name: string;
}

export interface DailyTaskTarget {
  targetId: string;
  targetCode: string;
  targetName: string;
  targetCategory: string;
  targetStatus?: string;
  standardList: TargetStandard[];
  executorName?: string;
  resultName?: string;
  tagIds: string[];
  tagNames: string;
  participateCondition: ParticipateItem;
}

/** 档位对象信息 */
export interface TaskTargetVO {
  id?: number | string | null;
  targetCategory?: string | null;
  targetCode?: string | null;
  targetName?: string | null;
  areaId?: string | null;
  areaName?: string | null;
  location?: string | null;
  IntAndLat?: string | null;
}

export interface DailyTaskModel {
  id: string;
  taskName: string;
  startTime: string;
  taskCategoryName: string;
  urgencyName: string;
  taskUserName: string;
  status: string;
  deadline: string;
}

export interface DailyTaskDetailsModel {
  id: string;
  dailyType: string;
  name: string;
  status: string;
  startTime: string;
  endTime: string;
  taskCategoryId: string;
  taskCategoryName: string;
  urgencyId: string;
  urgencyName: string;
  taskDay: number;
  taskHour: number;
  taskMinute: number;
  description: string;
  fileList: OSSFile[];
  superintendentType: string;
  superintendentList: {
    id: string;
    planId: string;
    superintendentType: string;
    targetId: string;
    targetName: string;
  }[];
  taskItemList: StandardRetItem[];
  targetTypeResultMap: Record<string, DailyTaskTarget[]>;
}

export interface DailyTaskRecordModel {
  id: string;
  dailyType: string;
  taskId: string;
  taskName: string;
  targetName?: string;
  executorId: string;
  executorName: string;
  executionTime: string;
  executionResult: string;
  recordStatus?: string;
  exceptionStatus?: string;
  repairUserId?: string;
  repairUserName?: string;
  allowRepair?: boolean;
}

export interface DailyTaskRecordDetailsModel {
  id: string;
  dailyType: string;
  taskId: string;
  taskName: string;
  executorId: string;
  executorName: string;
  executionTime: string;
  executionResult: string;
  recordStatus?: string;
  remark: string;
  fileList: OSSFile[];
  recordItemList: StandardItemResultModel[];
  targetList: TargetResultModel[];
  workOrderList: workOrderList[];
  exceptionList: DailyRecordExceptionModel[];
}

export interface TargetResultModel {
  masterId: string;
  targetId: string;
  targetName: string;
  targetCategory: string;
  standardResultList: StandardResultItemModel[];
  exception?: DailyRecordExceptionModel;
}

export interface DailyRecordExceptionModel {
  id: string;
  recordId: string;
  taskId: string;
  targetId?: string;
  targetName?: string;
  status: string;
  repairUserId: string;
  repairUserName: string;
  repairedTime?: string;
  allowRepair: boolean;
  repairList: DailyRecordRepairModel[];
}

export interface DailyRecordRepairModel {
  id: string;
  executionResult: string;
  handlerId: string;
  handlerName: string;
  remark?: string;
  createTime: string;
  fileList: OSSFile[];
}

export interface StandardResultModel {
  standardList: StandardResultItemModel[];
  workOrderList: workOrderList[];
}

export interface StandardResultItemModel {
  masterId: string;
  standardId: string;
  standardName: string;
  itemList: StandardItemResultModel[];
}

export interface workOrderList {
  id: string;
  taskId: string;
  recordId: string;
  targetId: string;
  targetCategory: string;
  workOrderType: string;
  processInstanceId: string;
  processInstanceName: string;
  processInstanceStatus: string;
}
export interface StandardItemResultModel {
  masterId: string;
  standardId: string;
  itemId: string;
  itemName: string;
  resultId: string;
  resultName: string;
  errorFlag: boolean;
  remark: string;
  fileList: OSSFile[];
}

export interface DailyTaskRelateModel {
  id: string;
  taskId: string;
  targetName: string;
  targetType: string;
  status: string;
  executorId: string;
  executorName: string;
  executionTime: string;
  executionResult: string;
  exceptionDetail: string;
  allowAssign: boolean;
  ruleList: ParticipateItem[];
}

export const DailyTaskTargetCategoryOptions = [
  {
    label: "全部",
    value: "",
  },
  {
    label: "区域",
    value: "AREA",
  },
  {
    label: "设备",
    value: "DEVICE",
  },
  {
    label: "档位",
    value: "STALL",
  },
  {
    label: "资产",
    value: "PROPERTY",
  },
  {
    label: "现场点",
    value: "SITE_POINT",
  },
  {
    label: "风险源",
    value: "RISK_SOURCE",
  },
  {
    label: "小散工程",
    value: "SMALL_ENGINEERING",
  },
  {
    label: "巡更点",
    value: "PATROL_POINT",
  },
];

export const DailyTaskTagOptions = [
  {
    value: "CHARGE",
    label: "违规充电",
  },
  {
    value: "PARKING",
    label: "违规停放",
  },
];

export const UrgencyColor = new Map([
  ["1", "#ff4158"],
  ["2", "#fb7712ff"],
  ["3", "#fadd22ff"],
  ["4", "#4d9af8ff"],
  ["5", "#6c825dff"],
]);

export const PlanStatusOptions = {
  RUNNING: "执行中",
  PAUSED: "已停用",
  FINISHED: "已结束",
};
export const PlanStatusMap = new Map([
  ["RUNNING", "执行中"],
  ["PAUSED", "已停用"],
  ["FINISHED", "已结束"],
]);
export const PlanStatusColor = new Map([
  ["RUNNING", "#1d66ff"],
  ["PAUSED", "#969799"],
  ["FINISHED", "#6ab539"],
]);

export const DailyTaskStatusOptions = {
  WAIT: "待处理",
  DONE: "已完成",
  TERMINATED: "已终止",
};
export enum DailyTaskStatus {
  WAIT = "WAIT",
  DONE = "DONE",
  TERMINATED = "TERMINATED",
  DRAFT = "DRAFT",
}

export const DailyTaskStatusMap = new Map([
  ["WAIT", "待处理"],
  ["DONE", "已完成"],
  ["TERMINATED", "已终止"],
]);
export const DailyTaskStatusColor = new Map([
  ["WAIT", "#ffaa26"],
  ["DONE", "#6ab539"],
  ["TERMINATED", "#969799"],
]);

export const TaskResultOptions = {
  NORMAL: "正常",
  ABNORMAL: "异常",
};
export interface BusinessTagModel {
  id: string;
  name: string;
  description: string;
  updateTime: string;
  parentId: string;
  level: number;
  childList: BusinessTagModel[];
}
export interface AddType {
  id?: string;
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
  draft: boolean;
  /** 是否持续性任务 */
  continuity?: boolean;
}
export const TaskResultStatusMap = new Map([
  ["NORMAL", "正常"],
  ["ABNORMAL", "异常"],
]);
export const TaskResultColor = new Map([
  ["NORMAL", "#1d66ff"],
  ["ABNORMAL", "#ff4158"],
]);

export const RecordStatusOptions = {
  NORMAL: "正常",
  ABNORMAL_WAIT_REPAIR: "异常待修复",
  ABNORMAL_REPAIRING: "异常修复中",
  ABNORMAL_REPAIRED: "异常已修复",
};
export const RecordStatusMap = new Map([
  ["NORMAL", "正常"],
  ["ABNORMAL_WAIT_REPAIR", "异常待修复"],
  ["ABNORMAL_REPAIRING", "异常修复中"],
  ["ABNORMAL_REPAIRED", "异常已修复"],
]);
export const RecordStatusColor = new Map([
  ["NORMAL", "#07c160"],
  ["ABNORMAL_WAIT_REPAIR", "#ee0a24"],
  ["ABNORMAL_REPAIRING", "#ff976a"],
  ["ABNORMAL_REPAIRED", "#1989fa"],
]);
export interface Statistics {
  dailyTaskNum: number;
  dailyTaskNumRate: number;
  processTaskNum: number;
  processTaskNumRate: number;
  uncompletedTaskNum: number;
  uncompletedTaskNumRate: number;
}

export interface TaskResultItem {
  name: string;
  id: string;
  resultLabelList: {
    label: string;
    value: string;
    errorFlag: boolean;
  }[];
}
export interface TaskUrgencyItem {
  id: string;
  name: string;
  level: number;
}
export interface TaskListItem {
  deadline: number;
  id: string;
  name: string;
  publishDepartment: string;
  publishUser: string;
  startTime: string;
  status: string;
  taskCategoryName: string;
  taskName: string;
  urgencyName: string;
  taskUserName: string;
  master: boolean;
  allowTransfer: boolean;
}
export interface TaskDetailModel {
  id: string;
  name: string;
  dailyType: string;
  taskType: string;
  personInChargeName: string;
  taskCategoryName: string;
  urgencyName: string;
  deadline: string;
  description: string;
  fileList: AttachmentItem[];
  taskItemList: TaskItemList[];
  status: string;
  taskCategoryId: string;
  urgencyId: string;
  taskDay: number;
  taskHour: number;
  taskMinute: number;
  superintendentType: string;
  method: string;
  requireProgress: number;
  isOnDuty: boolean;
  targetResultList: ParticipateItem[];
  participateList: {
    id: string;
    masterId: string;
    participateType: string;
    targetId: string;
    targetName: string;
  }[];
  superintendentList: {
    id: string;
    superintendentType: string;
    targetId: string;
    targetName: string;
  }[];
  allowSubmit: boolean;
  /** 是否允许处理任务 */
  allowHandle?: boolean;
  /** 是否允许反馈（持续性任务） */
  allowFeedback?: boolean;
  /** 是否持续性任务 */
  continuity?: boolean;
  handlerUserId?: string[];
  allowTransfer: boolean;
  allowDistribute: boolean;
  normalTaskRecord: {
    dailyType: string;
    executorId: string;
    executorName: string;
    executionTime: number;
    executionResult: string;
    fileList: OSSFile[];
    taskId: string;
    taskName: string;
    remark: string;
  };
}
export interface TaskItemList {
  content: string;
  createTime: string;
  id: string;
  name: string;
  tag: string;
  executeResult: executeResultItem;
  resultList: TaskItem[];
}
export interface executeResultItem {
  record: string;
  itemId: string;
  itemName: string;
  resultId: string;
  resultName: string;
  errorFlag: boolean;
  remark: string;
  fileList: OSSFile[];
}
export interface TaskItem {
  defaultResultItem: string;
  createTime: string;
  id: string;
  mustRemarkResultItems: string;
  mustTakePhotoResultItems: string;
  name: string;
  resultLabelJson: string;
}
export interface AttachmentItem {
  id: string;
  name: string;
  path: string;
  endpointPath: string;
  createTime: string;
  size: number;
  type?: string;
}

/** 日常任务反馈记录 */
export interface TaskFeedbackRecordVO {
  id?: number | string;
  taskId?: number | string;
  schedule?: number | string;
  description?: string;
  username?: string;
  feedbackDepId?: number | string;
  feedbackDepName?: string;
  /** 兼容后端大小写字段 */
  FeedbackDepName?: string;
  feedbackTime?: string;
  fileList?: AttachmentItem[];
}

export interface TaskObjectItem {
  id: string;
  name: string;
  typeName: string;
  departmentNames: string;
  areaName: string;
  tagNames: string;
  typeId: string;
  tagIds: string[];
}
export interface TaskObjectListItem {
  id: string;
  name: string;
  targetName: string;
  location: string;
  executorName: string;
  status: string;
  targetId: string;
  targetType: string;
  allowAssign: boolean;
  allowedHande: boolean;
  recordId: string;
  executionTime: string;
  taskId: string;
  targetLntAndLat: string;
  address: string;
  targetCode: string;
}
export interface TaskExecuteModel {
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
      }[]
    | null;
}

export interface TaskItemAllList {
  id: string;
  name: string;
  itemList: TaskObjItemList[];
}
export interface TaskObjItem {
  defaultResultItem: string;
  createTime: string;
  id: string;
  mustRemarkResultItems: string;
  mustTakePhotoResultItems: string;
  name: string;
  resultLabelJson: string;
  resultItemValue: string;
  resultItemName: string;
  isEditMore: boolean;
  isUploadImage: boolean;
  remark: string;
  errorFlag: boolean;
  fileIds: string[];
}
export interface FileType {
  businessKey: string;
  ossId: string;
  id: string;
  name: string;
  path: string;
  refCount: number;
  size: number;
  suffix: string;
  type: string;
}
export interface TaskObjItemList {
  content: string;
  createTime: string;
  id: string;
  name: string;
  tag: string;
  resultList: TaskObjItem[];
  itemList: TaskObjItem[];
  fileVOS: FileType[];
}
export interface QrcodeEntityVO {
  /**
   * 编号
   */
  code?: null | string;
  /**
   * 实体ID
   */
  entityId?: null | string;
  targetId?: null | string;
  /**
   * 实体名称
   */
  entityName?: null | string;
  /**
   * 实体类型
   */
  entityType?: null | string;
  id?: number | null;
  /**
   * 名称
   */
  name?: null | string;
}
export interface TaskSummaryModel {
  taskName: string;
  total: number;
  checked: number;
  abnormal: number;
  progress: number;
  status: string;
}

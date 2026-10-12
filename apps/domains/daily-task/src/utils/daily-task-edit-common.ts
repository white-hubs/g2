// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { type DailyTaskTarget, DailyTaskType, type ParticipateItem, type StandardRetItem } from "@g2-client/daily-task/client";
import type { VNodeRef } from "vue";

import type { ResponsibleObjectItem } from "@/components/daily-task-widgets";
import { ParticipateType } from "@/components/daily-task-widgets";

// 任务类型前缀映射
export const TASK_TYPE_PREFIX_MAP: Record<string, string> = {
  [DailyTaskType.DailyTask]: "日常",
  [DailyTaskType.Inspection]: "巡检",
  [DailyTaskType.SmallInspection]: "巡查",
  [DailyTaskType.GridTask]: "网格",
};

/**
 * 根据 DailyTaskType 获取任务类型标签文本
 * @param dailyType DailyTaskType 枚举值
 * @returns 任务类型标签文本
 */
export const getTaskTypeLabel = (dailyType?: string): string => {
  if (dailyType === DailyTaskType.Inspection) {
    return "巡检类型";
  }
  if (dailyType === DailyTaskType.SmallInspection) {
    return "巡查类型";
  }
  // 默认情况
  return "任务类型";
};

// 任务内容类型枚举
export enum ContentType {
  TARGET = "TARGET",
  STANDARD = "STANDARD",
  NORMAL = "NORMAL",
}

// 任务内容类型
export type ContentTypeValue = ContentType.TARGET | ContentType.STANDARD | ContentType.NORMAL;

// 内容模式配置接口
export interface ContentModeConfig {
  key: ContentTypeValue;
  label: string;
  validate?: (data: {
    targetContentData: { targetCategory: string; targetId: string; standardList: { id: string; name: string }[] }[];
    standardItemIds: string[];
    normalTaskContent: string;
  }) => { valid: boolean; errorMessage?: string };
  buildParams?: (data: {
    targetContentData: { targetCategory: string; targetId: string; standardList: { id: string; name: string }[] }[];
    standardItemIds: string[];
    normalTaskContent: string;
    responsibleObjectList: ResponsibleObjectItem[];
    targetTaskProgress: number | null;
    objectTaskMustScan: boolean;
  }) => Record<string, unknown>;
  renderContent?: (props: {
    isEdit: boolean;
    tableData: Record<string, DailyTaskTarget[]>;
    standardTableData: StandardRetItem[];
    normalTaskContent: string;
    onNormalTaskContentChange: (value: string) => void;
    taskContentRef: VNodeRef;
    standardContentRef: VNodeRef;
    taskId?: string | undefined;
  }) => JSX.Element;
}

// 提取错误信息
export const getErrorMessage = (error: unknown): string => {
  try {
    const errorObj = error as { toJSON?: () => { errorMessage?: string } };
    return errorObj.toJSON?.()?.errorMessage || "请求失败";
  } catch {
    return "请求失败";
  }
};

// 构建参与参数（包含 targetName）
export const buildParticipateParams = (
  item: ResponsibleObjectItem,
): { participateType: string; targetId: string; targetName: string }[] => {
  if (item.type === "USER") {
    return item.userOptions.map((opt) => ({ participateType: ParticipateType.USER, targetId: opt.id, targetName: opt.name }));
  }
  if (item.type === "CONDITION") {
    return [
      ...item.deptOptions.map((opt) => ({ participateType: ParticipateType.DEPT, targetId: opt.id, targetName: opt.name })),
      ...item.postOptions.map((opt) => ({ participateType: ParticipateType.POST, targetId: opt.id, targetName: opt.name })),
      ...item.roleOptions.map((opt) => ({ participateType: ParticipateType.ROLE, targetId: opt.id, targetName: opt.name })),
      ...item.gridAreaOptions.map((opt) => ({ participateType: ParticipateType.GRID_AREA, targetId: opt.id, targetName: opt.name })),
    ];
  }
  return [];
};

// 构建参与列表（兼容旧版本，不包含 targetName）
export const buildParticipateList = (
  responsibleObjectList: ResponsibleObjectItem[],
): {
  conditionType: string;
  participateParams: { participateType: string; targetId: string }[];
  abnormalUserIdList: string[];
}[] =>
  responsibleObjectList.map((item) => ({
    conditionType: item.type,
    participateParams: buildParticipateParams(item).map((p) => ({ participateType: p.participateType, targetId: p.targetId })),
    abnormalUserIdList: item.exceptionUserIds,
  }));

// 将 ResponsibleObjectItem 转换为 ParticipateItem
export const convertResponsibleObjectItemToParticipateItem = (item: ResponsibleObjectItem): ParticipateItem => ({
  conditionType: item.type,
  participateParams: buildParticipateParams(item),
  abnormalUserList: item.exceptionUserOptions.map((opt) => ({
    participateType: ParticipateType.USER,
    targetId: opt.id,
    targetName: opt.name,
  })),
});

// 将服务端返回的单个 ParticipateItem 转换为组件需要的 ResponsibleObjectItem 格式
export const convertParticipateItemToResponsibleObjectItem = (participateItem: ParticipateItem, index = 0): ResponsibleObjectItem => {
  const result: ResponsibleObjectItem = {
    key: `${Date.now()}-${index}-${Math.random()}`,
    type:
      participateItem.conditionType === "USER" || participateItem.conditionType === "CONDITION" ? participateItem.conditionType : "USER",
    userIds: [],
    userOptions: [],
    exceptionUserIds: [],
    exceptionUserOptions: [],
    deptIds: [],
    deptOptions: [],
    postIds: [],
    postOptions: [],
    roleIds: [],
    roleOptions: [],
    gridAreaIds: [],
    gridAreaOptions: [],
  };

  // 处理 participateParams，根据 participateType 分类
  participateItem.participateParams.forEach((param) => {
    const option = { id: param.targetId, name: param.targetName };
    switch (param.participateType) {
      case "USER": {
        result.userIds.push(param.targetId);
        result.userOptions.push(option);
        break;
      }
      case "DEPT": {
        result.deptIds.push(param.targetId);
        result.deptOptions.push(option);
        break;
      }
      case "POST": {
        result.postIds.push(param.targetId);
        result.postOptions.push(option);
        break;
      }
      case "ROLE": {
        result.roleIds.push(param.targetId);
        result.roleOptions.push(option);
        break;
      }
      case "GRID_AREA": {
        result.gridAreaIds.push(param.targetId);
        result.gridAreaOptions.push(option);
        break;
      }
      default: {
        break;
      }
    }
  });
  // 处理 abnormalUserList（异常用户列表）
  participateItem.abnormalUserList.forEach((abnormalUser) => {
    result.exceptionUserIds.push(abnormalUser.targetId);
    result.exceptionUserOptions.push({
      id: abnormalUser.targetId,
      name: abnormalUser.targetName,
    });
  });
  return result;
};

// 将服务端返回的 participateList 转换为组件需要的 ResponsibleObjectItem 格式
export const convertParticipateListToResponsibleObjectList = (participateList: ParticipateItem[]): ResponsibleObjectItem[] =>
  participateList.map((item, index) => convertParticipateItemToResponsibleObjectItem(item, index));

// ==================== 对象任务进度相关工具函数 ====================

/**
 * 根据对象数量计算可输入的百分比选项
 * @param count 对象总数
 * @returns 百分比选项数组，格式：{ label: string; value: number }[]
 */
export const calculateAllowedProgressOptions = (count: number): { label: string; value: number }[] => {
  if (count === 0) {
    return [];
  }
  // 计算可输入的百分比：100 * i / count，i = 1, 2, ..., count，使用四舍五入
  const options: { label: string; value: number }[] = [];
  for (let i = 1; i <= count; i++) {
    const percentage = Math.round((100 * i) / count);
    // 避免重复的百分比值
    if (options.length === 0 || options.at(-1).value !== percentage) {
      options.push({
        label: `${percentage}%`,
        value: percentage,
      });
    }
  }
  return options;
};

/**
 * 验证并调整百分比值，如果不合理则返回最接近的合理值
 * @param inputValue 输入的百分比值
 * @param allowedOptions 允许的百分比选项
 * @returns 调整后的百分比值
 */
export const validateAndAdjustProgress = (
  inputValue: number | null | undefined,
  allowedOptions: { label: string; value: number }[],
): number | null => {
  if (inputValue === null || inputValue === undefined) {
    return allowedOptions.length > 0 ? allowedOptions[0].value : null;
  }
  if (allowedOptions.length === 0) {
    return null;
  }
  // 检查输入值是否在允许的选项中
  const isValid = allowedOptions.some((opt) => opt.value === inputValue);
  if (isValid) {
    return inputValue;
  }
  // 找到最接近的合理百分比
  let closestValue = allowedOptions[0].value;
  let minDiff = Math.abs(inputValue - closestValue);
  for (const opt of allowedOptions) {
    const diff = Math.abs(inputValue - opt.value);
    if (diff < minDiff) {
      minDiff = diff;
      closestValue = opt.value;
    }
  }
  return closestValue;
};

/**
 * 处理输入框失焦时的百分比验证和调整
 * @param params 参数对象
 * @param params.enableTargetTaskProgress 是否启用目标任务进度
 * @param params.targetTaskProgress 当前输入的百分比值
 * @param params.allowedOptions 允许的百分比选项
 * @returns 调整后的百分比值，如果不需要调整则返回原值
 */
export const handleProgressInputBlur = (params: {
  enableTargetTaskProgress: boolean;
  targetTaskProgress: number | null;
  allowedOptions: { label: string; value: number }[];
}): number | null => {
  const { enableTargetTaskProgress, targetTaskProgress, allowedOptions } = params;
  if (!enableTargetTaskProgress) {
    return targetTaskProgress;
  }
  // 如果值为空，设置为第一个合理值或 0
  if (targetTaskProgress === null || targetTaskProgress === undefined) {
    return allowedOptions.length > 0 ? allowedOptions[0].value : 0;
  }
  // 验证并调整百分比值
  return validateAndAdjustProgress(targetTaskProgress, allowedOptions);
};

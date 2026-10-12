// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import type { DailyTaskRelateModel } from "@g2-client/daily-task/client";

// 分发方案类型
export enum DistributeSchemeType {
  SCHEME_ONE = "SCHEME_ONE", // 方案一：先选择对象，再选择人员
  SCHEME_TWO = "SCHEME_TWO", // 方案二：选择人员+对象个数
}

// 用户选择项类型
export interface UserSelectItem {
  id: string;
  name: string;
}

// 方案二的用户对象个数数据
export interface UserCountItem {
  userId: string;
  userName: string;
  count: number | undefined; // 分配的对象个数
}

// 方案三的部门标签数据
export interface DepartmentTagItem {
  tagId: string;
  tagName: string;
  userDTOList: {
    id: string;
    name: string;
  }[];
}

// 方案三的标签对象数据
export interface TagObjectItem {
  id: string;
  name: string;
  targetCount: number; // 待巡检数
  principals: {
    id: string;
    name: string;
  }[];
  selectedPrincipalId?: string; // 选中的处理人ID
  inspectionCount?: number; // 巡检数，默认为待巡检数
}

// 分发数据接口
export interface DistributeData {
  schemeType: DistributeSchemeType;
  // 方案一的数据
  targetList?: DailyTaskRelateModel[];
  userId?: string;
  userName?: string;
  // 方案二的数据（新方式：多个用户，每个用户设置对象个数）
  userCountList?: UserCountItem[];
}

// 验证结果接口
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

// 策略上下文接口
export interface StrategyContext {
  taskId: string;
  distributeData: DistributeData;
  currentStep: { value: number };
  selectedScheme: { value: DistributeSchemeType | null };
  totalTargetCount: { value: number };
  departmentTagList: { value: DepartmentTagItem[] };
  loadingTagObjects: { value: boolean };
  message: {
    error: (msg: string) => void;
  };
}

// 步骤索引常量
export const STEP_INDEX = {
  SELECT_SCHEME: 0, // 选择分发方案
  SELECT_TARGET: 1, // 选择分发对象/人员
  SELECT_USER_OR_SET: 2, // 选择人员/设置完成数量
  CONFIRM: 3, // 确认分发
} as const;

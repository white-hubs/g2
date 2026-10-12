// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import type { JSX } from "vue/jsx-runtime";

import type { DistributeSchemeType } from "./types";
import type { DistributeData, StrategyContext, ValidationResult } from "./types";

// 重新导出类型，方便使用
export type { StrategyContext, ValidationResult, DistributeData };

// 策略接口
export interface DistributeSchemeStrategy {
  // 方案类型
  readonly schemeType: DistributeSchemeType;

  // ==================== 步骤管理 ====================
  // 获取策略的步骤集合（不包括"选择方案"步骤，从步骤1开始）
  getSteps(): string[];

  // 获取下一步索引（如果当前是最后一步，返回 null）
  getNextStep(currentStep: number): number | null;

  // 获取上一步索引（如果当前是第一步，返回 null）
  getPrevStep(currentStep: number): number | null;

  // 判断是否是最后一步（确认步骤）
  isLastStep(currentStep: number): boolean;

  // ==================== 初始化和清理 ====================
  // 初始化（切换方案时调用，负责数据加载等）
  initialize?(context: StrategyContext): Promise<void>;

  // 清理数据（切换方案时调用）
  clearData(context: StrategyContext): void;

  // ==================== 验证和渲染 ====================
  // 验证当前步骤数据（包含错误提示）
  validateStep(context: StrategyContext, stepIndex: number): ValidationResult;

  // 渲染步骤内容（返回渲染函数）
  renderStep(context: StrategyContext, stepIndex: number): (() => JSX.Element) | null;

  // 渲染确认页面（返回渲染函数）
  renderConfirm(context: StrategyContext): () => JSX.Element;

  // ==================== 数据获取 ====================
  // 获取最终提交数据（已经过处理和过滤）
  getSubmitData(context: StrategyContext): DistributeData;
}

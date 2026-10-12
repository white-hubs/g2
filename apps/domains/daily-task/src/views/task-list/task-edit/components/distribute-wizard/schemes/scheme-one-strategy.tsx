// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import type { DailyTaskRelateModel } from "@g2-client/daily-task/client";

import { AssignableTargetForm } from "../../assignable-target-form";
import type { DistributeData, DistributeSchemeStrategy, StrategyContext, ValidationResult } from "./base-strategy";
import { DistributeSchemeType } from "./types";
import { STEP_INDEX } from "./types";
import { UserSelectTable } from "@/components/daily-task-widgets";

import styles from "../index.module.css";

// 错误消息常量
const ERROR_MESSAGES = {
  SELECT_TARGET: "请选择至少一个分发对象",
  SELECT_USER: "请选择处理人员",
} as const;

// 用户选择项类型
interface UserSelectItem {
  id: string;
  name: string;
}

export class SchemeOneStrategy implements DistributeSchemeStrategy {
  readonly schemeType = DistributeSchemeType.SCHEME_ONE;

  // ==================== 步骤管理 ====================
  getSteps(): string[] {
    return ["选择分发对象", "选择处理人员", "确认分发"];
  }

  getNextStep(currentStep: number): number | null {
    if (currentStep === STEP_INDEX.SELECT_TARGET) {
      return STEP_INDEX.SELECT_USER_OR_SET;
    }
    if (currentStep === STEP_INDEX.SELECT_USER_OR_SET) {
      return STEP_INDEX.CONFIRM;
    }
    if (currentStep === STEP_INDEX.CONFIRM) {
      return null; // 已经是最后一步
    }
    return null;
  }

  getPrevStep(currentStep: number): number | null {
    if (currentStep === STEP_INDEX.SELECT_USER_OR_SET) {
      return STEP_INDEX.SELECT_TARGET;
    }
    if (currentStep === STEP_INDEX.CONFIRM) {
      return STEP_INDEX.SELECT_USER_OR_SET;
    }
    return null;
  }

  isLastStep(currentStep: number): boolean {
    return currentStep === STEP_INDEX.CONFIRM;
  }

  // ==================== 初始化和清理 ====================
  clearData(context: StrategyContext): void {
    delete context.distributeData.targetList;
    delete context.distributeData.userId;
    delete context.distributeData.userName;
  }

  // ==================== 验证和渲染 ====================
  validateStep(context: StrategyContext, stepIndex: number): ValidationResult {
    if (stepIndex === STEP_INDEX.SELECT_TARGET) {
      // 步骤1：只验证对象
      if (!context.distributeData.targetList || context.distributeData.targetList.length === 0) {
        return { valid: false, message: ERROR_MESSAGES.SELECT_TARGET };
      }
    } else if (stepIndex === STEP_INDEX.SELECT_USER_OR_SET) {
      // 步骤2：只验证人员
      if (!context.distributeData.userId) {
        return { valid: false, message: ERROR_MESSAGES.SELECT_USER };
      }
    } else if (stepIndex === STEP_INDEX.CONFIRM) {
      // 确认步骤：验证完整数据
      if (!context.distributeData.targetList || context.distributeData.targetList.length === 0) {
        return { valid: false, message: ERROR_MESSAGES.SELECT_TARGET };
      }
      if (!context.distributeData.userId) {
        return { valid: false, message: ERROR_MESSAGES.SELECT_USER };
      }
    }
    return { valid: true };
  }

  renderStep(context: StrategyContext, stepIndex: number): (() => JSX.Element) | null {
    if (stepIndex === STEP_INDEX.SELECT_TARGET) {
      // 方案一：显示对象选择表单
      return () => (
        <div class={styles.stepContent}>
          <AssignableTargetForm
            taskId={context.taskId}
            selectedKeys={context.distributeData.targetList?.map((item) => item.id)}
            onSelectionChange={(selectedRows: DailyTaskRelateModel[]) => {
              context.distributeData.targetList = selectedRows;
            }}
          />
        </div>
      );
    } else if (stepIndex === STEP_INDEX.SELECT_USER_OR_SET) {
      // 方案一：显示人员选择表格
      return () => (
        <div class={styles.stepContent}>
          <UserSelectTable
            multiple={false}
            selectedKeys={context.distributeData.userId ? [context.distributeData.userId] : undefined}
            onSelectionChange={(selectedRows: UserSelectItem[]) => {
              if (selectedRows.length === 0) {
                delete context.distributeData.userId;
                delete context.distributeData.userName;
                return;
              }
              context.distributeData.userId = selectedRows[0].id;
              context.distributeData.userName = selectedRows[0].name;
            }}
          />
        </div>
      );
    }
    return null;
  }

  renderConfirm(context: StrategyContext): () => JSX.Element {
    return () => (
      <div class={styles.stepContent}>
        <div class={styles.summary}>
          <div class={styles.summaryItem}>
            <span class={styles.label}>分发方案：</span>
            <span>按对象分发</span>
          </div>
          <div class={styles.summaryItem}>
            <span class={styles.label}>已选择对象：</span>
            <span>{context.distributeData.targetList?.length || 0} 个</span>
          </div>
          <div class={styles.summaryItem}>
            <span class={styles.label}>处理人员：</span>
            <span>{context.distributeData.userName || "未选择"}</span>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 数据获取 ====================
  getSubmitData(context: StrategyContext): DistributeData {
    // 方案一直接返回数据，不需要特殊处理
    return { ...context.distributeData };
  }
}

// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import type { DistributeData, DistributeSchemeStrategy, StrategyContext, ValidationResult } from "./base-strategy";
import { DistributeSchemeType } from "./types";
import { STEP_INDEX } from "./types";
import { cubeDailyTaskService } from "@/api/server";
import { UserSelectTable } from "@/components/daily-task-widgets";
import { InputNumber } from "@/pc-ui-runtime";

import styles from "../index.module.css";

// 错误消息常量
const ERROR_MESSAGES = {
  SELECT_USER: "请选择处理人员",
  EXCEED_TOTAL_COUNT: "所有用户的对象个数之和不能超过对象总数",
} as const;

// 用户选择项类型
interface UserSelectItem {
  id: string;
  name: string;
}

export class SchemeTwoStrategy implements DistributeSchemeStrategy {
  readonly schemeType = DistributeSchemeType.SCHEME_TWO;

  // ==================== 步骤管理 ====================
  getSteps(): string[] {
    return ["选择处理人员", "设置对象个数", "确认分发"];
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
  async initialize(context: StrategyContext): Promise<void> {
    // 获取可分配对象总数
    try {
      const result = await cubeDailyTaskService.getDailyTaskRelatePage({
        pageSize: 1,
        pageNumber: 1,
        allowAssign: true,
        taskId: context.taskId,
      });
      context.totalTargetCount.value = result.total || 0;
    } catch {
      context.totalTargetCount.value = 0;
    }
  }

  clearData(context: StrategyContext): void {
    delete context.distributeData.userCountList;
  }

  validateStep(context: StrategyContext, stepIndex: number): ValidationResult {
    if (stepIndex === STEP_INDEX.SELECT_TARGET) {
      // 步骤1：只验证是否选择了人员
      if (!context.distributeData.userCountList || context.distributeData.userCountList.length === 0) {
        return { valid: false, message: ERROR_MESSAGES.SELECT_USER };
      }
      return { valid: true };
    } else if (stepIndex === STEP_INDEX.SELECT_USER_OR_SET) {
      // 步骤2：验证每个人员的对象个数
      return this.validateUserCounts(context);
    } else if (stepIndex === STEP_INDEX.CONFIRM) {
      // 确认步骤：验证完整数据
      return this.validateUserCounts(context);
    }
    return { valid: true };
  }

  private validateUserCounts(context: StrategyContext): ValidationResult {
    if (!context.distributeData.userCountList || context.distributeData.userCountList.length === 0) {
      return { valid: false, message: ERROR_MESSAGES.SELECT_USER };
    }

    // 1. 首先过滤掉没有输入对象个数或对象个数为0的用户
    const validUserList = context.distributeData.userCountList.filter(
      (item) => item.count !== undefined && item.count !== null && item.count > 0,
    );

    // 2. 确认至少有一个用户设置了对象数量
    if (validUserList.length === 0) {
      return { valid: false, message: "请至少为一个用户设置对象个数" };
    }

    // 3. 验证每个有效用户的对象个数
    for (const item of validUserList) {
      const { count } = item;
      // 验证必须是整数
      if (count === undefined || count === null || !Number.isInteger(count)) {
        return { valid: false, message: `${item.userName} 的对象个数必须是整数` };
      }
      // 验证对象数量在可分发数量的范围内（单个用户不能超过总数）
      if (count > context.totalTargetCount.value) {
        return {
          valid: false,
          message: `${item.userName} 的对象个数不能超过可分发对象总数（${context.totalTargetCount.value} 个）`,
        };
      }
    }

    // 4. 验证总对象个数不超过对象总数
    const totalCount = validUserList.reduce((sum, item) => sum + (item.count || 0), 0);
    if (totalCount > context.totalTargetCount.value) {
      return { valid: false, message: ERROR_MESSAGES.EXCEED_TOTAL_COUNT };
    }

    return { valid: true };
  }

  renderStep(context: StrategyContext, stepIndex: number): (() => JSX.Element) | null {
    if (stepIndex === STEP_INDEX.SELECT_TARGET) {
      // 方案二：显示人员选择表格（多选）
      return () => (
        <div class={styles.stepContent}>
          <UserSelectTable
            multiple={true}
            selectedKeys={context.distributeData.userCountList?.map((item) => item.userId)}
            onSelectionChange={(selectedRows: UserSelectItem[]) => {
              if (selectedRows.length === 0) {
                delete context.distributeData.userCountList;
                return;
              }
              // 将选中的用户转换为 userCountList，保留已有的对象个数设置
              const existingCountMap = new Map<string, number | undefined>();
              if (context.distributeData.userCountList) {
                context.distributeData.userCountList.forEach((item) => {
                  existingCountMap.set(item.userId, item.count);
                });
              }
              context.distributeData.userCountList = selectedRows.map((user) => ({
                userId: user.id,
                userName: user.name,
                count: existingCountMap.get(user.id),
              }));
            }}
          />
        </div>
      );
    } else if (stepIndex === STEP_INDEX.SELECT_USER_OR_SET) {
      // 方案二：设置每个处理人员的对象个数
      if (!context.distributeData.userCountList || context.distributeData.userCountList.length === 0) {
        return () => (
          <div class={styles.stepContent}>
            <div style={{ textAlign: "center", padding: "40px 0", color: "#8c8c8c" }}>请先选择处理人员</div>
          </div>
        );
      }

      // 计算已分配的对象总数
      const totalAssigned = context.distributeData.userCountList.reduce((sum, item) => sum + (item.count || 0), 0);
      const remainingCount = context.totalTargetCount.value - totalAssigned;

      // 计算每个用户的最大对象个数
      const getMaxCountForUser = (currentIndex: number): number => {
        if (
          !context.distributeData.userCountList ||
          context.distributeData.userCountList.length === 0 ||
          context.totalTargetCount.value === 0
        ) {
          return context.totalTargetCount.value;
        }
        // 计算前面所有用户的对象个数之和
        const previousSum = context.distributeData.userCountList.slice(0, currentIndex).reduce((sum, item) => sum + (item.count || 0), 0);
        // 当前用户的最大值 = 对象总数 - 前面用户的对象个数之和
        return Math.max(0, context.totalTargetCount.value - previousSum);
      };

      return () => (
        <div class={styles.stepContent}>
          <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
            <div style={{ fontSize: "14px", color: "#666" }}>
              <span>可供分发的对象总数：</span>
              <span style={{ fontWeight: "bold", color: "var(--cube-theme-var--primary-color, #1890ff)" }}>
                {context.totalTargetCount.value} 个
              </span>
              <span style={{ marginLeft: "16px" }}>已分配：</span>
              <span style={{ fontWeight: "bold", color: totalAssigned > context.totalTargetCount.value ? "#ff4d4f" : "#52c41a" }}>
                {totalAssigned} 个
              </span>
              <span style={{ marginLeft: "16px" }}>剩余：</span>
              <span style={{ fontWeight: "bold", color: remainingCount < 0 ? "#ff4d4f" : "#52c41a" }}>{remainingCount} 个</span>
            </div>
          </div>
          <div class={styles.scrollableList}>
            {context.distributeData.userCountList?.map((item, index) => {
              const maxCount = getMaxCountForUser(index);
              return (
                <div key={item.userId} class={styles.formItem} style={{ marginBottom: "24px" }}>
                  <span class={styles.label}>{item.userName}：</span>
                  <InputNumber
                    v-model:value={item.count}
                    min={0}
                    max={maxCount}
                    precision={0}
                    placeholder={`请输入对象个数（0-${maxCount}）`}
                    style={{ width: "200px" }}
                    onBlur={() => {
                      if (item.count === undefined || item.count === null) {
                        item.count = 0;
                      }
                      // 如果输入值超过最大值，自动调整为最大值
                      if (item.count > maxCount) {
                        item.count = maxCount;
                      }
                      // 确保是整数
                      if (item.count !== undefined && item.count !== null) {
                        item.count = Math.floor(item.count);
                      }
                    }}
                  />
                  <span style={{ marginLeft: "8px" }}>个</span>
                  {maxCount === 0 && <span style={{ marginLeft: "8px", color: "#ff4d4f" }}>（已无剩余对象可分配）</span>}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  }

  renderConfirm(context: StrategyContext): () => JSX.Element {
    // 过滤掉对象个数为0的用户
    const validUserCountList = context.distributeData.userCountList?.filter((item) => (item.count || 0) > 0) || [];
    const totalAssigned = validUserCountList.reduce((sum, item) => sum + (item.count || 0), 0);

    return () => (
      <div class={styles.stepContent}>
        <div class={styles.summary}>
          <div class={styles.summaryItem}>
            <span class={styles.label}>分发方案：</span>
            <span>按对象个数分发</span>
          </div>
          {validUserCountList.length > 0 ? (
            <>
              <div class={styles.summaryItem}>
                <span class={styles.label}>对象总数：</span>
                <span>{context.totalTargetCount.value} 个</span>
                <span style={{ marginLeft: "24px" }}>
                  <span class={styles.label}>处理人员：</span>
                  <span>{validUserCountList.length} 人</span>
                </span>
                <span style={{ marginLeft: "24px" }}>
                  <span class={styles.label}>已分配对象总数：</span>
                  <span style={{ color: totalAssigned > context.totalTargetCount.value ? "#ff4d4f" : undefined }}>{totalAssigned} 个</span>
                </span>
              </div>
              <div class={styles.scrollableList}>
                {validUserCountList.map((item) => (
                  <div key={item.userId} class={styles.summaryItem}>
                    <span class={styles.label}>{item.userName}：</span>
                    <span>{item.count} 个对象</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#ff4d4f" }}>请为各用户设置对象个数</div>
          )}
        </div>
      </div>
    );
  }

  // ==================== 数据获取 ====================
  getSubmitData(context: StrategyContext): DistributeData {
    // 过滤掉没有输入对象个数与对象个数为0的用户
    const filteredUserCountList = context.distributeData.userCountList?.filter(
      (item) => item.count !== undefined && item.count !== null && item.count > 0,
    );
    const result: DistributeData = {
      schemeType: context.distributeData.schemeType,
    };
    if (filteredUserCountList && filteredUserCountList.length > 0) {
      result.userCountList = filteredUserCountList;
    }
    return result;
  }
}

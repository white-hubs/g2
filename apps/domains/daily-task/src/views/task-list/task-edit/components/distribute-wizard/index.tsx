// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { computed, defineComponent, reactive, ref, watch } from "vue";

import { CloseOutlined } from "@/components/daily-task-widgets";
import { Modal, message } from "@/pc-ui-runtime";
import { Radio, Steps } from "@/pc-ui-runtime";
const { Step } = Steps;
import { DistributeSchemeStrategyFactory, type StrategyContext } from "./schemes";
import { STEP_INDEX, DistributeSchemeType, type DistributeData, type DepartmentTagItem } from "./schemes/types";

import styles from "./index.module.css";

// 分发方案配置
export interface DistributeSchemeConfig {
  type: DistributeSchemeType;
  label: string;
  description: string;
  steps: string[];
}

interface Props {
  taskId: string;
  onConfirm?: (data: DistributeData) => Promise<void>;
}

// 错误消息常量
const ERROR_MESSAGES = {
  SELECT_SCHEME: "请选择分发方案",
} as const;

// 分发方案配置列表（动态生成，使用策略的 getSteps() 方法）
export const DISTRIBUTE_SCHEME_CONFIGS: DistributeSchemeConfig[] = (() => {
  const configs: DistributeSchemeConfig[] = [
    {
      type: DistributeSchemeType.SCHEME_ONE,
      label: "按对象分发",
      description: "先选择需要分发的对象，再指定对应的人员",
      steps: [],
    },
    {
      type: DistributeSchemeType.SCHEME_TWO,
      label: "按对象个数分发",
      description: "可选择多个处理人员，并设置每个处理人分配的对象个数",
      steps: [],
    },
  ];

  // 为每个配置填充步骤：选择分发方案 + 策略的步骤
  configs.forEach((config) => {
    const strategy = DistributeSchemeStrategyFactory.getStrategy(config.type);
    if (strategy) {
      config.steps = ["选择分发方案", ...strategy.getSteps()];
    } else {
      // 如果策略不存在，使用默认步骤
      config.steps = ["选择分发方案"];
    }
  });

  return configs;
})();

// ==================== 组件实现 ====================

export const DistributeWizard = defineComponent({
  props: ["taskId", "onConfirm"],
  emits: ["cancel"],
  setup(props: Props, { emit, expose }) {
    // ==================== 状态定义 ====================
    const currentStep = ref<number>(STEP_INDEX.SELECT_SCHEME);
    const selectedScheme = ref<DistributeSchemeType | null>(DistributeSchemeType.SCHEME_ONE);
    const showModal = ref<boolean>(false);
    const distributeData = reactive<DistributeData>({
      schemeType: DistributeSchemeType.SCHEME_ONE,
    });
    // 可分配对象总数
    const totalTargetCount = ref<number>(0);
    // 方案三的状态
    const departmentTagList = ref<DepartmentTagItem[]>([]);
    const loadingTagObjects = ref<boolean>(false);

    // 当前策略
    const currentStrategy = computed(() => DistributeSchemeStrategyFactory.getStrategy(selectedScheme.value));

    // 策略上下文
    const strategyContext: StrategyContext = {
      taskId: props.taskId ?? "",
      distributeData,
      currentStep,
      selectedScheme,
      totalTargetCount,
      departmentTagList,
      loadingTagObjects,
      message,
    };

    // ==================== 计算属性 ====================
    // 获取策略的步骤集合（不包括"选择方案"步骤）
    const stepTitles = computed(() => {
      if (currentStrategy.value) {
        return ["选择分发方案", ...currentStrategy.value.getSteps()];
      }
      return ["选择分发方案"];
    });

    const okText = computed(() => {
      if (currentStep.value === STEP_INDEX.SELECT_SCHEME) {
        return "下一步";
      }
      if (currentStrategy.value?.isLastStep(currentStep.value)) {
        return "确认分发";
      }
      return "下一步";
    });

    const cancelText = computed(() => (currentStep.value > STEP_INDEX.SELECT_SCHEME ? "上一步" : "取消"));

    const isLastStep = computed(() => {
      if (currentStep.value === STEP_INDEX.SELECT_SCHEME) {
        return false;
      }
      return currentStrategy.value?.isLastStep(currentStep.value) ?? false;
    });

    // ==================== 工具函数 ====================

    // 重置状态
    const resetState = (): void => {
      currentStep.value = STEP_INDEX.SELECT_SCHEME;
      selectedScheme.value = DistributeSchemeType.SCHEME_ONE;
      distributeData.schemeType = DistributeSchemeType.SCHEME_ONE;
      // 清除所有方案的数据
      if (currentStrategy.value) {
        currentStrategy.value.clearData(strategyContext);
      }
    };

    // 监听方案切换，清除之前方案的数据并初始化新方案
    watch(selectedScheme, async (newScheme, oldScheme) => {
      // 如果方案发生变化，清除之前方案的数据
      if (oldScheme !== null && newScheme !== null && oldScheme !== newScheme) {
        const oldStrategy = DistributeSchemeStrategyFactory.getStrategy(oldScheme);
        if (oldStrategy) {
          oldStrategy.clearData(strategyContext);
        }
        // 更新方案类型
        distributeData.schemeType = newScheme;
        // 初始化新方案
        const newStrategy = DistributeSchemeStrategyFactory.getStrategy(newScheme);
        if (newStrategy?.initialize) {
          await newStrategy.initialize(strategyContext);
        }
      }
    });

    // ==================== 验证函数 ====================

    // 验证当前步骤数据
    const validateCurrentStep = (): boolean => {
      if (currentStep.value === STEP_INDEX.SELECT_SCHEME) {
        if (!selectedScheme.value) {
          message.error(ERROR_MESSAGES.SELECT_SCHEME);
          return false;
        }
        return true;
      }

      // 使用策略进行验证
      if (currentStrategy.value) {
        const result = currentStrategy.value.validateStep(strategyContext, currentStep.value);
        if (!result.valid) {
          message.error(result.message || "");
          return false;
        }
      }

      return true;
    };

    // ==================== 步骤处理函数 ====================

    // 处理步骤0：选择方案
    const handleStepSelectScheme = async (): Promise<void> => {
      if (!selectedScheme.value) {
        message.error(ERROR_MESSAGES.SELECT_SCHEME);
        return;
      }
      distributeData.schemeType = selectedScheme.value;
      // 初始化策略
      const strategy = DistributeSchemeStrategyFactory.getStrategy(selectedScheme.value);
      if (strategy?.initialize) {
        await strategy.initialize(strategyContext);
      }
      currentStep.value = STEP_INDEX.SELECT_TARGET;
    };

    // 下一步
    const handleNext = async (): Promise<void> => {
      if (!validateCurrentStep()) {
        return;
      }

      if (currentStep.value === STEP_INDEX.SELECT_SCHEME) {
        // 选择方案步骤：初始化策略并跳转到第一步
        await handleStepSelectScheme();
      } else if (currentStrategy.value) {
        // 使用策略的步骤导航
        const nextStep = currentStrategy.value.getNextStep(currentStep.value);
        if (nextStep !== null) {
          currentStep.value = nextStep;
        }
      }
    };

    // 上一步
    const handlePrev = (): void => {
      if (currentStep.value === STEP_INDEX.SELECT_SCHEME) {
        return; // 已经是第一步
      }
      if (currentStrategy.value) {
        // 使用策略的步骤导航
        const prevStep = currentStrategy.value.getPrevStep(currentStep.value);
        if (prevStep !== null) {
          currentStep.value = prevStep;
        } else {
          currentStep.value = STEP_INDEX.SELECT_SCHEME;
        }
      } else {
        // 如果没有策略，直接返回选择方案步骤
        currentStep.value = STEP_INDEX.SELECT_SCHEME;
      }
    };

    // ==================== 事件处理函数 ====================

    // 打开弹窗
    const openModal = async (): Promise<void> => {
      resetState();
      // 初始化默认选中的方案（方案三）
      const defaultStrategy = DistributeSchemeStrategyFactory.getStrategy(DistributeSchemeType.SCHEME_ONE);
      if (defaultStrategy?.initialize) {
        await defaultStrategy.initialize(strategyContext);
      }
      showModal.value = true;
    };

    // 直接关闭弹窗（用于右上角关闭按钮）
    const handleClose = (): void => {
      if (!showModal.value) {
        return;
      }
      resetState();
      showModal.value = false;
      emit("cancel");
    };

    // 取消或上一步（用于底部取消按钮）
    const handleCancel = (e?: Event): void => {
      if (currentStep.value > STEP_INDEX.SELECT_SCHEME) {
        // 上一步
        e?.preventDefault?.();
        e?.stopPropagation?.();
        handlePrev();
        showModal.value = true;
      } else {
        // 取消
        handleClose();
      }
    };

    // 确定或下一步
    const handleOk = async (): Promise<void> => {
      if (isLastStep.value) {
        handleConfirm();
      } else {
        await handleNext();
      }
    };

    // 确认分发
    const handleConfirm = async (): Promise<void> => {
      // 使用策略验证数据
      if (currentStrategy.value) {
        const result = currentStrategy.value.validateStep(strategyContext, STEP_INDEX.CONFIRM);
        if (!result.valid) {
          message.error(result.message || "");
          return;
        }
      }

      try {
        if (props.onConfirm) {
          // 使用策略获取最终提交数据
          const submitData = currentStrategy.value?.getSubmitData(strategyContext) ?? distributeData;
          await props.onConfirm(submitData);
        }
        resetState();
        showModal.value = false;
      } catch {
        // 错误处理由外部处理
      }
    };

    // ==================== 渲染函数 ====================

    // 渲染步骤0：选择分发方案
    const renderStepSelectScheme = (): JSX.Element => (
      <div class={styles.stepContent}>
        <div class={styles.schemeList}>
          {DISTRIBUTE_SCHEME_CONFIGS.map((config) => (
            <div
              key={config.type}
              class={[styles.schemeItem, selectedScheme.value === config.type ? styles.selected : ""]}
              onClick={() => {
                selectedScheme.value = config.type;
              }}
            >
              <Radio checked={selectedScheme.value === config.type} />
              <div class={styles.schemeInfo}>
                <div class={styles.schemeLabel}>{config.label}</div>
                <div class={styles.schemeDescription}>{config.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );

    // 渲染步骤1：选择对象/人员（使用策略）
    const renderStepSelectTarget = (): JSX.Element => {
      if (currentStrategy.value) {
        const renderFn = currentStrategy.value.renderStep(strategyContext, STEP_INDEX.SELECT_TARGET);
        if (renderFn) {
          return renderFn();
        }
      }
      return <div class={styles.stepContent}>未知方案</div>;
    };

    // 渲染步骤2：选择人员/设置对象个数（使用策略）
    const renderStepSelectUserOrSet = (): JSX.Element => {
      if (currentStrategy.value) {
        const renderFn = currentStrategy.value.renderStep(strategyContext, STEP_INDEX.SELECT_USER_OR_SET);
        if (renderFn) {
          return renderFn();
        }
      }
      return <div class={styles.stepContent}>未知方案</div>;
    };

    // 渲染步骤3：确认分发（使用策略）
    const renderStepConfirm = (): JSX.Element => {
      if (currentStrategy.value) {
        return currentStrategy.value.renderConfirm(strategyContext)();
      }
      return <div class={styles.stepContent}>未知方案</div>;
    };

    // 渲染步骤内容
    const renderStepContent = (): JSX.Element => {
      switch (currentStep.value) {
        case STEP_INDEX.SELECT_SCHEME: {
          return renderStepSelectScheme();
        }
        case STEP_INDEX.SELECT_TARGET: {
          return renderStepSelectTarget();
        }
        case STEP_INDEX.SELECT_USER_OR_SET: {
          return renderStepSelectUserOrSet();
        }
        case STEP_INDEX.CONFIRM: {
          return renderStepConfirm();
        }
        default: {
          return <div class={styles.stepContent}>未知步骤</div>;
        }
      }
    };

    // ==================== 暴露方法 ====================
    expose({
      openModal,
    });

    // ==================== 渲染组件 ====================
    return (): JSX.Element => (
      <Modal
        width="1200px"
        visible={showModal.value}
        closable={false}
        title={
          <div class={styles.modalTitle}>
            <span>任务分发</span>
            <CloseOutlined class={styles.closeIcon} onClick={handleClose} />
          </div>
        }
        onOk={handleOk}
        onCancel={handleCancel}
        okText={okText.value}
        cancelText={cancelText.value}
      >
        <div class={styles.wizardContainer}>
          <Steps current={currentStep.value} class={styles.steps}>
            {stepTitles.value.map((title, index) => (
              <Step key={index} title={title} />
            ))}
          </Steps>
          <div class={styles.content}>{renderStepContent()}</div>
        </div>
      </Modal>
    );
  },
});

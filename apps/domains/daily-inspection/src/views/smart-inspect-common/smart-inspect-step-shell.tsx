// @ts-nocheck -- 从 cube daily-inspection smart-inspect-common 迁入，对齐旧仓 JSX 写法。
import { Step, Steps } from "@g2-platform/pc-ui";
import { computed, defineComponent, type PropType } from "vue";

import styles from "@/views/smart-inspect-common/smart-inspect-page.module.css";

export interface SmartInspectStepItem {
  key: string;
  title: string;
  description?: string;
  disabled?: boolean;
  render: () => JSX.Element;
}

export const SmartInspectStepShell = defineComponent({
  name: "SmartInspectStepShell",
  props: {
    steps: {
      type: Array as PropType<SmartInspectStepItem[]>,
      required: true,
    },
    activeKey: {
      type: String,
      required: true,
    },
    clickable: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["change"],
  setup: (props, { emit }) => {
    const currentIndex = computed(() => {
      const index = props.steps.findIndex((item) => item.key === props.activeKey);
      return index >= 0 ? index : 0;
    });

    const handleStepChange = (index: number): void => {
      const step = props.steps[index];
      if (!props.clickable || !step || step.disabled) return;
      emit("change", step.key);
    };

    const renderStepTitle = (item: SmartInspectStepItem, index: number): JSX.Element => (
      <span
        class={[
          styles["smart-step-title"],
          index < currentIndex.value ? styles["smart-step-title-completed"] : undefined,
          index === currentIndex.value ? styles["smart-step-title-active"] : undefined,
          item.disabled ? styles["smart-step-title-disabled"] : undefined,
        ]}
      >
        {item.title}
      </span>
    );

    const renderStepDescription = (item: SmartInspectStepItem, index: number): JSX.Element | undefined => {
      if (!item.description) return undefined;
      return (
        <span
          class={[styles["smart-step-description"], index < currentIndex.value ? styles["smart-step-description-completed"] : undefined]}
        >
          {item.description}
        </span>
      );
    };

    return (): JSX.Element => (
      <div class={styles["step-shell"]}>
        <Steps size="small" class={styles["step-nav"]} current={currentIndex.value} onChange={handleStepChange}>
          {props.steps.map((item, index) => (
            <Step
              key={item.key}
              title={renderStepTitle(item, index)}
              description={renderStepDescription(item, index)}
              disabled={item.disabled}
            />
          ))}
        </Steps>
        <div class={styles["step-panels"]}>
          {props.steps.map((item, index) => (
            <div
              key={item.key}
              class={[styles["step-panel"], index === currentIndex.value ? styles["step-panel-active"] : styles["step-panel-hidden"]]}
            >
              {item.render()}
            </div>
          ))}
        </div>
      </div>
    );
  },
});

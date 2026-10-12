// @ts-nocheck -- 从 cube daily-inspection smart-inspect-common 迁入。
import { Button } from "@g2-platform/pc-ui";
import { computed, defineComponent, type PropType } from "vue";

import { getSmartTargetCategoryLabel, smartInspectTargetTypeOptions, type SmartInspectTargetCategory } from "./types";

import styles from "./smart-inspect-page.module.css";

export const SmartInspectTargetTypeSelect = defineComponent({
  name: "SmartInspectTargetTypeSelect",
  props: {
    value: {
      type: Array as PropType<SmartInspectTargetCategory[]>,
      default: () => [],
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:value"],
  setup: (props, { emit }) => {
    const selectedSet = computed(() => new Set(props.value));

    const updateValue = (value: SmartInspectTargetCategory[]): void => {
      emit("update:value", value);
    };

    const toggleValue = (value: SmartInspectTargetCategory): void => {
      if (props.readonly) return;
      const nextSet = new Set(props.value);
      if (nextSet.has(value)) {
        nextSet.delete(value);
      } else {
        // 无人机与机器狗互斥，对齐旧仓业务规则
        if (value === "DRONE") {
          nextSet.delete("ROBOT_DOG");
        }
        if (value === "ROBOT_DOG") {
          nextSet.delete("DRONE");
        }
        nextSet.add(value);
      }
      updateValue([...nextSet]);
    };

    const renderSelectedTargetBar = (): JSX.Element | null => {
      if (!props.value.length) return null;
      return (
        <div class={[styles["selected-target-bar"], props.readonly ? styles["selected-target-bar-readonly"] : undefined]}>
          <div class={styles["selected-target-tags"]}>
            <span class={styles["selected-target-label"]}>已选类型：</span>
            {props.value.map((value) => (
              <span key={value} class={styles["selected-target-tag"]}>
                {getSmartTargetCategoryLabel(value)}
              </span>
            ))}
          </div>
          {!props.readonly && (
            <Button size="small" onClick={() => updateValue([])}>
              清空全部
            </Button>
          )}
        </div>
      );
    };

    return (): JSX.Element => (
      <div class={styles["target-type-section"]}>
        {props.readonly ? (
          renderSelectedTargetBar()
        ) : (
          <>
            <div class={styles["target-type-header"]}>
              <div class={styles["section-title"]}>选择巡检对象类型</div>
              <span>勾选本次需要巡检的对象类型，后续步骤将引导配置具体对象</span>
            </div>
            <div class={styles["target-type-grid"]}>
              {smartInspectTargetTypeOptions.map((item) => {
                const selected = selectedSet.value.has(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    class={[styles["target-type-card"], selected ? styles["target-type-card-selected"] : ""]}
                    onClick={() => toggleValue(item.value)}
                  >
                    <span class={styles["target-type-check"]}>✓</span>
                    <span class={styles["target-type-icon"]}>{item.icon}</span>
                    <span class={styles["target-type-name"]}>{item.label}</span>
                    <span class={styles["target-type-desc"]}>{item.desc}</span>
                  </button>
                );
              })}
            </div>
            {renderSelectedTargetBar()}
          </>
        )}
      </div>
    );
  },
});

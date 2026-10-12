import { defineComponent, type PropType } from "vue";

import type { ControlAction } from "../models";
import { Button } from "@/pc-ui-runtime";
import { renderControlButtonIcon } from "@/utils/render-control-button-icon";

import styles from "../fire-host-control.module.css";

const buttonClass = (action: ControlAction): string[] => {
  if (action.style === "red") {
    return [styles.controlButton, styles.controlRed];
  }
  if (action.style === "blue") {
    return [styles.controlButton, styles.controlBlue];
  }
  return [styles.controlButton, styles.controlGray];
};

export const ControlButtonPanel = defineComponent({
  name: "ControlButtonPanel",
  props: {
    actions: { type: Array as PropType<ControlAction[]>, required: true },
    loading: { type: Boolean, required: true },
    pending: { type: Boolean, required: true },
  },
  emits: { control: (_action: ControlAction) => true },
  setup(props, { emit }) {
    return () => (
      <div class={styles.controlButtons}>
        {props.actions.map((button) => (
          <Button
            key={button.buttonId}
            class={buttonClass(button)}
            disabled={props.pending || !button.enabled}
            onClick={(event: MouseEvent) => {
              (event.currentTarget as HTMLButtonElement).blur();
              emit("control", button);
            }}
          >
            <span class={styles.controlButtonIcon}>{renderControlButtonIcon(button)}</span>
            <span class={styles.controlButtonLabel}>{button.label}</span>
          </Button>
        ))}
        {props.loading ? <div class={styles.controlButtonEmpty}>正在加载按钮配置...</div> : undefined}
        {!props.loading && props.actions.length === 0 ? <div class={styles.controlButtonEmpty}>当前主机未配置控制按钮</div> : undefined}
      </div>
    );
  },
});

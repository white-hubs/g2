import type { SourceStatus } from "@g2-contract/security-opinion";
/** @jsxImportSource vue */
import { defineComponent } from "vue";

import { SOURCE_STATUS_LABEL } from "../../constants";

import styles from "./source-status-dot.module.css";

const DOT_CLASS: Record<SourceStatus, string> = {
  running: styles.running,
  paused: styles.paused,
  abnormal: styles.abnormal,
};

export const SourceStatusDot = defineComponent({
  props: {
    status: { type: String as () => SourceStatus, required: true },
  },
  setup(props) {
    return () => (
      <span class={styles.wrap}>
        <span class={[styles.dot, DOT_CLASS[props.status]]} />
        {SOURCE_STATUS_LABEL[props.status]}
      </span>
    );
  },
});

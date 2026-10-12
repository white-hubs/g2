import { type VNode, defineComponent } from "vue";

import { VerticalLine } from "../vertical-line/vertical-line";

import styles from "./chunk.module.less";
export const Chunk = defineComponent({
  props: {
    title: {
      type: String,
      default: "",
    },
    showFooter: {
      type: Boolean,
      default: true,
    },
  },
  setup:
    (props, { slots }) =>
    (): VNode => (
      <div class={styles["container-la"]}>
        <div class={styles["layout-header"]}>
          <VerticalLine title={props.title} />
          {slots["layout-header"]?.()}
        </div>
        <div class={styles["header-btn"]}>{slots["header-btn"]?.()}</div>
        <div class={styles["layout-content"]}>{slots["layout-content"]?.()}</div>

        {slots.default?.()}
      </div>
    ),
});

import { defineComponent } from "vue";

import styles from "./index.module.less";
export const TextLabel = defineComponent({
  props: {
    title: {
      type: String,
      default: () => "标题",
    },
    backgroundColor: {
      type: String,
      default: "#fff",
    },
  },
  setup: (props) => {
    return () => (
      <div class={styles.container}>
        <div class={styles.title} style={{ backgroundColor: props.backgroundColor }}>
          {props.title}
        </div>
        <div class={styles.line} style={{ backgroundColor: props.backgroundColor }}>
          <div class={styles.circle} style={{ borderColor: props.backgroundColor }}></div>
        </div>
      </div>
    );
  },
});

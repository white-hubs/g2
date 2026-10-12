import { defineComponent } from "vue";

import styles from "./index.module.less";
export const CardLabel = defineComponent({
  props: {
    title: {
      type: String,
      default: () => "标题",
    },
    backgroundColor: {
      type: String,
      default: "#fff",
    },
    detail: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
  },
  setup: (props) => {
    return () => (
      <div class={styles.container}>
        <div class={styles.card} style={{ background: props.backgroundColor }}>
          <div class={styles.title}>{props.title}</div>
          <div class={styles.content}>{props.detail}</div>
          {props.image && (
            <div class={styles.image}>
              <img src={props.image} width="100%" height="100%" />
            </div>
          )}
        </div>
        <div class={styles.line} style={{ background: props.backgroundColor }}>
          <div class={styles.circle} style={{ borderColor: props.backgroundColor }}></div>
        </div>
      </div>
    );
  },
});

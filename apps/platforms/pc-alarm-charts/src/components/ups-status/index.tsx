import { defineComponent } from "vue";

import styles from "./index.module.less";
const upsIcon = "/resource/v1/cube-alarm-charts/ups-icon.png";
export const UpsStatusComponent = defineComponent({
  props: {
    label: {
      type: String,
      default: () => "A相电压",
    },
    value: {
      type: String,
      default: () => "40",
    },
    unit: {
      type: String,
      default: () => "",
    },
  },
  setup: (props) => {
    return () => (
      <div class={styles.container}>
        <img src={upsIcon} width="34" height="46" alt="" srcset="" />
        <div class={styles.content}>
          <div class={styles.title}>{props.label}</div>
          <div class={styles.value}>{props.value}</div>
        </div>
      </div>
    );
  },
});

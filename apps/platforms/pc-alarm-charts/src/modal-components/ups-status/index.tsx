import { defineComponent } from "vue";

import styles from "./index.module.less";
const upsIcon = "/resource/v1/cube-alarm-charts/ups-icon.png";
export const ModalUpsStatusComponent = defineComponent({
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
    isAlarmModal: {
      type: Boolean,
      default: () => false,
    },
  },
  setup: (props) => {
    return () => (
      <div class={styles.container}>
        <img src={upsIcon} width="68" height="92" alt="" srcset="" />
        <div class={styles.content}>
          <div class={styles.title}>{props.label}</div>
          <div class={styles.value}>{props.value}</div>
        </div>
      </div>
    );
  },
});

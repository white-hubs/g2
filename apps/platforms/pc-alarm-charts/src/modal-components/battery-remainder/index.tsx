import { defineComponent } from "vue";

import styles from "./index.module.less";
const batteryIcon = "/resource/v1/cube-alarm-charts/battery-icon.png";
export const ModalBatteryRemainderComponent = defineComponent({
  props: {
    label: {
      type: String,
      default: () => "A相电压",
    },
    value: {
      type: Number || String,
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
        <img src={batteryIcon} width="68" height="92" alt="" srcset="" />
        <div class={styles.content}>
          <div class={styles.title}>{props.label}</div>
          <div class={styles.value}>
            {props.value}
            {props.unit}
          </div>
        </div>
      </div>
    );
  },
});

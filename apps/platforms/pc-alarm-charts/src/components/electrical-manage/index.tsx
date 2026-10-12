import { defineComponent } from "vue";

import { SemicircleChart } from "../charts/index";

import styles from "./index.module.less";
export const VoltageComponent = defineComponent({
  props: {
    label: {
      type: String,
      default: () => "A相电压",
    },
    value: {
      type: Number,
      default: () => 40,
    },
    isAlarmModal: {
      type: Boolean,
      default: () => false,
    },
    unit: {
      type: String,
      default: () => "",
    },
    min: {
      type: Number,
      default: () => 0,
    },
    max: {
      type: Number,
      default: () => 200,
    },
  },
  setup: (props) => {
    return () => (
      <div class={styles.container}>
        <SemicircleChart min={props.min} max={props.max} value={props.value} />
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

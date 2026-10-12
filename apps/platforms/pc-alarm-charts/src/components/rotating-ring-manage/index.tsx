import { defineComponent } from "vue";

import { StageGaugeChart } from "../charts/index";

import styles from "./index.module.less";
export const HeatComponent = defineComponent({
  props: {
    label: {
      type: String,
      default: () => "温度",
    },
    value: {
      type: Number,
      default: () => 40,
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
        <StageGaugeChart value={props.value} min={props.min} max={props.max} />
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

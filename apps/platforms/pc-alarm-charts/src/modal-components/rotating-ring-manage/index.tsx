import { defineComponent } from "vue";

import { StageGaugeChart } from "../charts/index";
export const ModalHeatComponent = defineComponent({
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
      <div>
        <StageGaugeChart min={props.min} max={props.max} label={props.label} unit={props.unit} value={props.value} />
      </div>
    );
  },
});

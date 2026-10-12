import { defineComponent } from "vue";

import { SemicircleChart } from "../charts/index";
export const ModalVoltageComponent = defineComponent({
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
        <SemicircleChart unit={props.unit} label={props.label} min={props.min} max={props.max} value={props.value} />
      </div>
    );
  },
});

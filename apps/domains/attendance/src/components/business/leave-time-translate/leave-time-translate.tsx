import { InputNumber } from "@g2-platform/pc-ui";
import { type VNode, defineComponent } from "vue";

import style from "./leave-time-translate.module.less";

interface Props {
  unit: "HOUR" | "HALF_DAY" | "DAY";
}

/** 请假规则-时间折算组件 */
export const LeaveTimeTranslate = defineComponent({
  props: ["unit"],
  setup: (props: Props) => (): VNode => (
    <>
      {props.unit !== "DAY" && (
        <div class={style["leave-time-translate"]}>
          <span>半天折算时长</span>
          <div style="width:120px;margin:0 10px">
            <InputNumber min={1} />
          </div>
          <span>小时=上午</span>
        </div>
      )}
      {props.unit !== "DAY" && (
        <div class={style["leave-time-translate"]}>
          <span>半天折算时长</span>
          <div style="width:120px;margin:0 10px">
            <InputNumber min={1} />
          </div>
          <span>小时=上午</span>
        </div>
      )}
      {props.unit !== "HALF_DAY" && (
        <div class={style["leave-time-translate"]}>
          <span>一天折算时长</span>
          <div style="width:120px;margin:0 10px">
            <InputNumber min={1} />
          </div>
          <span>小时=1天</span>
        </div>
      )}
    </>
  ),
});

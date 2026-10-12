import { Button, Empty } from "@g2-platform/pc-ui";
import { defineComponent } from "vue";

import { openScadaStudio } from "@/utils/scada-pages";

export const ScadaPlaceholder = defineComponent({
  name: "ScadaPlaceholder",
  props: {
    title: {
      type: String,
      default: "组态图",
    },
    description: {
      type: String,
      default: "",
    },
    copy: {
      type: String,
      default: "",
    },
    showConfigure: {
      type: Boolean,
      default: false,
    },
  },
  setup:
    (props, { slots }) =>
    () => (
      <div class="scada-placeholder">
        <Empty description={props.description || `${props.title}待接入`} />
        {props.copy ? <div class="scada-placeholder-copy">{props.copy}</div> : null}
        {props.showConfigure ? (
          <Button type="primary" onClick={openScadaStudio}>
            去二维组态配置
          </Button>
        ) : null}
        {slots.default?.()}
      </div>
    ),
});

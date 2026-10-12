import { defineComponent } from "vue";

import { GVerticalLine } from "./g-vertical-line";

import "./c-layout.less";

/** 看板卡片区块布局：对齐旧仓 cLayout */
export const CLayout = defineComponent({
  name: "CLayout",
  props: {
    title: { type: String, default: "" },
  },
  setup(props, { slots, attrs }) {
    return () => (
      <div class={["energy-c-layout", attrs.class]} style={attrs.style as string | Record<string, string> | undefined}>
        <div class="energy-c-layout-header">
          <div class="energy-c-layout-header-name">
            <GVerticalLine title={props.title} />
          </div>
          <div class="energy-c-layout-header-btn">{slots["header-btn"]?.()}</div>
        </div>
        <div class="energy-c-layout-content">{slots.content?.()}</div>
        {slots.default?.()}
      </div>
    );
  },
});

export default CLayout;

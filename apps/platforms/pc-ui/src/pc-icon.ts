import { defineComponent, h } from "vue";

/** 使用壳层已加载的业务图标字体，统一尺寸与无障碍语义。 */
export const PcIcon = defineComponent({
  name: "PcIcon",
  props: { iconClass: { type: String, required: true }, size: { type: Number, default: 16 } },
  setup: (props) => () => h("i", { class: ["iconfont", props.iconClass], style: { fontSize: `${props.size}px` }, "aria-hidden": true }),
});

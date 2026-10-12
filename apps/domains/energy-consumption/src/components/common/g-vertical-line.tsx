import { defineComponent } from "vue";

import "./g-vertical-line.less";

/** 区块标题左侧色条 */
export const GVerticalLine = defineComponent({
  name: "GVerticalLine",
  props: {
    title: { type: String, default: "" },
  },
  setup(props) {
    return () => <span class="energy-vertical-line">{props.title}</span>;
  },
});

export default GVerticalLine;

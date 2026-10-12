// @ts-nocheck — 迁移期视图层
import { defineComponent } from "vue";

/** 规则详情分区标题（竖线样式） */
export const VerticalLine = defineComponent({
  name: "VerticalLine",
  props: {
    title: {
      type: String,
      default: "",
    },
  },
  setup(props) {
    return (): JSX.Element => <span class="verticalLine primary-color-before">{props.title}</span>;
  },
});

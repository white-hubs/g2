import { type VNode, defineComponent } from "vue";

export const VerticalLine = defineComponent({
  props: {
    title: {
      type: String,
      default: "",
    },
  },
  setup: (props) => (): VNode => <span class="verticalLine primary-color-before">{props.title}</span>,
});

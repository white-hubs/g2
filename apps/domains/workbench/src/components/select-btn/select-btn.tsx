import { defineComponent, reactive, onMounted } from "vue";

import "./select-btn.less";

interface SelectItem {
  label: string;
  value: string;
}

interface SelectBtnProps {
  list: SelectItem[];
}

interface SelectBtnState {
  active: string;
}

export default defineComponent({
  name: "SelectBtn",
  props: {
    list: {
      type: Array<SelectItem>,
      required: false,
      default: () => [
        { label: "近一日", value: "Day" },
        { label: "本月", value: "Month" },
        { label: "本年", value: "Year" },
      ],
    },
  },
  emits: ["change"],
  setup(props: SelectBtnProps, { emit }) {
    const state = reactive<SelectBtnState>({
      active: "Day",
    });

    onMounted(() => {
      if (props.list?.[0]) {
        state.active = props.list[0].value;
      }
    });

    const handleClick = (item: SelectItem): void => {
      state.active = item.value;
      emit("change", item.value);
    };

    return () => (
      <div class="date-container">
        {props.list?.map((item) => (
          <div
            key={item.value}
            class={item.value === state.active ? "primary-color" : ""}
            onClick={(e) => {
              e.stopPropagation();
              handleClick(item);
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    );
  },
});

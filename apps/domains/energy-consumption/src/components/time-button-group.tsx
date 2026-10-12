import dayjs from "dayjs";
import { defineComponent, onMounted, reactive } from "vue";

import { Button, Space } from "@/pc-ui-runtime";

import "./time-button-group.less";

const btnList: Record<string, string> = {
  THIS_WEEK: "本周",
  THIS_MONTH: "本月",
  THIS_YEAR: "全年",
};

export const TimeButtonGroup = defineComponent({
  name: "TimeButtonGroup",
  emits: ["update:value", "change"],
  setup(_props, { emit }) {
    const state = reactive<{
      dates: [string, string];
      checkedBtn: string;
      period: string;
    }>({
      dates: ["", ""],
      checkedBtn: "THIS_WEEK",
      period: "",
    });

    onMounted(() => {
      const startOfWeek = dayjs().startOf("week").format("YYYY-MM-DD");
      const endOfWeek = dayjs().endOf("week").format("YYYY-MM-DD");
      state.dates = [startOfWeek, endOfWeek];
      state.period = `${startOfWeek} 00:00:00,${endOfWeek} 23:59:59`;
      emit("update:value", state.period);
      emit("change", state.period);
    });

    const getDate = (key: string) => {
      state.checkedBtn = key;
      switch (key) {
        case "THIS_WEEK": {
          const startOfWeek = dayjs().startOf("week").format("YYYY-MM-DD");
          const endOfWeek = dayjs().endOf("week").format("YYYY-MM-DD");
          state.dates = [startOfWeek, endOfWeek];
          state.period = `${startOfWeek} 00:00:00,${endOfWeek} 23:59:59`;
          break;
        }
        case "THIS_MONTH": {
          const startOfMonth = dayjs().startOf("month").format("YYYY-MM-DD");
          const endOfMonth = dayjs().endOf("month").format("YYYY-MM-DD");
          state.dates = [startOfMonth, endOfMonth];
          state.period = `${startOfMonth} 00:00:00,${endOfMonth} 23:59:59`;
          break;
        }
        case "THIS_YEAR": {
          const startOfYear = dayjs().startOf("year").format("YYYY-MM-DD");
          const endOfYear = dayjs().endOf("year").format("YYYY-MM-DD");
          state.dates = [startOfYear, endOfYear];
          state.period = `${startOfYear} 00:00:00,${endOfYear} 23:59:59`;
          break;
        }
        default:
          break;
      }
      emit("update:value", state.period);
      emit("change", state.period, state.checkedBtn);
    };

    return () => (
      <Space class="time-button-group">
        {Object.entries(btnList).map(([key, val]) => (
          <Button key={key} type={state.checkedBtn === key ? "primary" : "default"} size="middle" onClick={() => getDate(key)}>
            {val}
          </Button>
        ))}
      </Space>
    );
  },
});

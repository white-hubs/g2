import type { PropType } from "vue";
import { defineComponent, h, onMounted, reactive, ref } from "vue";

import { Button, RangePicker, Space, dayjs, type Dayjs } from "@/pc-ui-runtime";

import "./time-group.less";

/** 时间按钮组 + 区间，对齐旧仓 timeGroup */
export const TimeGroup = defineComponent({
  name: "TimeGroup",
  props: {
    showRangePicker: { type: Boolean, default: false },
    btns: {
      type: Object as PropType<Record<string, string>>,
      default: () => ({
        TODAY: "今日",
        THIS_MONTH: "本月",
        THIS_YEAR: "今年",
      }),
    },
  },
  emits: ["update:value", "change"],
  setup(props, { emit, expose }) {
    const state = reactive<{
      dates: [string, string];
      checkedBtn: string;
      period: string;
    }>({
      dates: ["", ""],
      checkedBtn: "TODAY",
      period: "",
    });
    const day = ref<Dayjs[]>([]);

    onMounted(() => {
      state.checkedBtn = props.btns.TODAY === "今日" ? "TODAY" : "THIS_MONTH";
      emit("update:value", state.period);
      emit("change", state.checkedBtn);
    });

    const getDateSubsce = (key: string) => {
      state.checkedBtn = key;
      state.dates = ["", ""];
      emit("update:value", "");
      emit("change", state.checkedBtn);
    };

    const changePicker = () => {
      state.checkedBtn = "";
      const dates = state.dates;
      if (!dates?.[0] || !dates?.[1]) return;
      dates[0] = dayjs(dates[0]).format("YYYY-MM-DD 00:00:00");
      dates[1] = dayjs(dates[1]).format("YYYY-MM-DD 23:59:59");
      state.period = `${dates[0]},${dates[1]}`;
      emit("update:value", state.period);
      emit("change", state.checkedBtn);
    };

    const disabledPriceRangeDate = (current: Dayjs) => {
      if (!day.value.length) return false;
      const today = dayjs(day.value[0]).add(1, "year");
      const oneYearAgo = dayjs(state.dates[0]).subtract(1, "year");
      return Boolean(current && (current > today || current < oneYearAgo));
    };

    const setcheckedBtn = (value: string) => {
      state.checkedBtn = value;
      state.dates = ["", ""];
    };

    expose({ getDateSubsce, setcheckedBtn });

    return () => (
      <Space class="time-group">
        {Object.entries(props.btns).map(([key, label]) => (
          <Button key={key} type={state.checkedBtn === key ? "primary" : "default"} size="middle" onClick={() => getDateSubsce(key)}>
            {label}
          </Button>
        ))}
        {props.showRangePicker
          ? h(RangePicker, {
              value: state.dates,
              format: "YYYY-MM-DD HH:mm:ss",
              valueFormat: "YYYY-MM-DD HH:mm:ss",
              allowClear: false,
              style: { width: 315 },
              disabledDate: disabledPriceRangeDate,
              onCalendarChange: (value: unknown) => {
                day.value = ((value as Dayjs[]) || []).filter(Boolean);
              },
              onChange: (value: unknown) => {
                state.dates = ((value as [string, string]) || ["", ""]) as [string, string];
                changePicker();
              },
            })
          : null}
      </Space>
    );
  },
});

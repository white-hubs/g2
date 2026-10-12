import type { PropType } from "vue";
import { defineComponent, h, onMounted, reactive, ref } from "vue";

import { Button, RangePicker, Space, dayjs, type Dayjs } from "@/pc-ui-runtime";

import "./time-radio-group.less";

type PeriodKey = "TODAY" | "THIS_MONTH" | "THIS_YEAR" | string;

/** 日/月/年 + 可选区间选择，对齐旧仓 timeRadioGroup */
export const TimeRadioGroup = defineComponent({
  name: "TimeRadioGroup",
  props: {
    showRangePicker: { type: Boolean, default: false },
    btns: {
      type: Object as PropType<Record<string, string>>,
      default: () => ({
        THIS_YEAR: "年",
        THIS_MONTH: "月",
        TODAY: "日",
      }),
    },
  },
  emits: ["update:value", "change"],
  setup(props, { emit, expose }) {
    const state = reactive<{
      dates: [string, string];
      checkedBtn: PeriodKey;
      period: string;
    }>({
      dates: ["", ""],
      checkedBtn: "THIS_MONTH",
      period: "",
    });
    const day = ref<Dayjs[]>([]);

    onMounted(() => {
      state.checkedBtn = props.btns.TODAY === "今日" ? "TODAY" : "THIS_MONTH";
      const nowTime = dayjs().format("YYYY-MM");
      const startTime = dayjs().add(1, "month").startOf("month").format("YYYY-MM");
      state.dates = [nowTime, startTime];
      state.period = `${nowTime}-01 00:00:00,${startTime}-01 23:59:59`;
      emit("update:value", state.period);
      emit("change", state.checkedBtn);
    });

    const getDateSubsce = (key: string) => {
      state.checkedBtn = key;
      state.dates = ["", ""];
    };

    const changePicker = () => {
      const dates = state.dates;
      if (!dates?.[0] || !dates?.[1]) return;
      if (state.checkedBtn === "TODAY") {
        dates[0] = dayjs(dates[0]).format("YYYY-MM-DD 00:00:00");
        dates[1] = dayjs(dates[1]).format("YYYY-MM-DD 23:59:59");
      } else if (state.checkedBtn === "THIS_MONTH") {
        dates[0] = dayjs(dates[0]).startOf("month").format("YYYY-MM-DD HH:mm:ss");
        dates[1] = dayjs(dates[1]).endOf("month").format("YYYY-MM-DD HH:mm:ss");
      } else {
        dates[0] = dayjs(dates[0]).startOf("year").format("YYYY-MM-DD HH:mm:ss");
        dates[1] = dayjs(dates[1]).endOf("year").format("YYYY-MM-DD HH:mm:ss");
      }
      state.period = `${dates[0]},${dates[1]}`;
      emit("update:value", state.period);
      emit("change", state.checkedBtn);
    };

    const disabledYear = (current: Dayjs) => current.year() <= 1970;

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

    const renderRangePicker = (picker?: "month" | "year") => {
      const format = picker === "year" ? "YYYY" : picker === "month" ? "YYYY-MM" : "YYYY-MM-DD";
      return h(RangePicker, {
        ...(picker ? { picker } : {}),
        value: state.dates,
        format,
        valueFormat: format,
        allowClear: false,
        style: { width: 315 },
        ...(picker === "year" ? { disabledDate: disabledYear } : picker ? {} : { disabledDate: disabledPriceRangeDate }),
        onCalendarChange: (value: unknown) => {
          day.value = ((value as Dayjs[]) || []).filter(Boolean);
        },
        onChange: (value: unknown) => {
          state.dates = ((value as [string, string]) || ["", ""]) as [string, string];
          changePicker();
        },
      });
    };

    expose({ getDateSubsce, setcheckedBtn });

    return () => (
      <Space class="time-radio-group">
        {Object.entries(props.btns).map(([key, label]) => (
          <Button key={key} type={state.checkedBtn === key ? "primary" : "default"} size="middle" onClick={() => getDateSubsce(key)}>
            {label}
          </Button>
        ))}
        {props.showRangePicker ? (
          <div>
            {state.checkedBtn === "TODAY" ? renderRangePicker() : null}
            {state.checkedBtn === "THIS_MONTH" ? renderRangePicker("month") : null}
            {state.checkedBtn === "THIS_YEAR" ? renderRangePicker("year") : null}
          </div>
        ) : null}
      </Space>
    );
  },
});

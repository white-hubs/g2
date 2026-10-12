import { defineComponent, reactive } from "vue";

import { loadPcUi } from "./runtime-modules";
const { Button, RadioGroup, RangePicker, Space, dayjs } = await loadPcUi();
export const TIME_DIMENSIONS = [
  { label: "今日", value: "TODAY" },
  { label: "本周", value: "THIS_WEEK" },
  { label: "本月", value: "THIS_MONTH" },
  { label: "本年", value: "THIS_YEAR" },
];
export function datePeriod(dimension: string): string {
  const unit = dimension === "THIS_WEEK" ? "week" : dimension === "THIS_MONTH" ? "month" : dimension === "THIS_YEAR" ? "year" : "day";
  return `${dayjs().startOf(unit).format("YYYY-MM-DD HH:mm:ss")},${dayjs().endOf(unit).format("YYYY-MM-DD HH:mm:ss")}`;
}
export const TimeFilter = defineComponent({
  emits: { change: (_value: { dimension: string; period: string }) => true, reset: () => true },
  setup(_props, { emit, slots }) {
    const dimensionDates = (dimension: string) =>
      datePeriod(dimension)
        .split(",")
        .map((value) => dayjs(value).format("YYYY-MM-DD"));
    const state = reactive({ dimension: "TODAY", dates: dimensionDates("TODAY") });
    const submit = () =>
      emit("change", {
        dimension: state.dimension,
        period:
          state.dates.length === 2
            ? `${dayjs(state.dates[0]).startOf("day").format("YYYY-MM-DD HH:mm:ss")},${dayjs(state.dates[1]).endOf("day").format("YYYY-MM-DD HH:mm:ss")}`
            : datePeriod(state.dimension),
      });
    return () => (
      <Space wrap>
        <RadioGroup
          optionType="button"
          buttonStyle="solid"
          options={TIME_DIMENSIONS}
          value={state.dimension}
          onChange={(event) => {
            state.dimension = String(event.target.value);
            state.dates = dimensionDates(state.dimension);
            submit();
          }}
        />
        <RangePicker
          style={{ width: "260px" }}
          value={state.dates.length === 2 ? [state.dates[0], state.dates[1]] : undefined}
          valueFormat="YYYY-MM-DD"
          onChange={(_dates, values) => {
            state.dates = values.filter(Boolean);
            if (state.dates.length === 2) {
              state.dimension = "";
            } else {
              state.dimension = "TODAY";
            }
            submit();
          }}
        />
        {slots.filters?.()}
        <Button
          onClick={() => {
            state.dimension = "TODAY";
            state.dates = dimensionDates("TODAY");
            emit("reset");
            submit();
          }}
        >
          重置
        </Button>
        <Button type="primary" onClick={submit}>
          查询
        </Button>
      </Space>
    );
  },
});

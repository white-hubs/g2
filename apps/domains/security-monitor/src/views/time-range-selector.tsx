// @ts-nocheck — pc-ui RangePicker wraps Ant Design Vue and uses Dayjs values.
import { defineComponent, onMounted, ref } from "vue";

import { defineAsyncSecurityPcUiComponent, loadSecurityPcUi } from "./pc-ui-runtime";

const FORMAT = "YYYY-MM-DD HH:mm:ss";

const Button = defineAsyncSecurityPcUiComponent("Button");
const RangePicker = defineAsyncSecurityPcUiComponent("RangePicker");
const Space = defineAsyncSecurityPcUiComponent("Space");

function dateRange(dayjs: any, type: string): [any, any] {
  const now = dayjs();
  if (type === "THIS_WEEK") {
    const weekday = now.day();
    return [now.subtract(weekday === 0 ? 6 : weekday - 1, "day").startOf("day"), now];
  }
  if (type === "THIS_MONTH") return [now.startOf("month"), now];
  if (type === "THIS_YEAR") return [now.startOf("year"), now];
  return [now.startOf("day"), now];
}

export default defineComponent({
  name: "SecurityMonitorTimeRangeSelector",
  props: {
    trendMode: { type: Boolean, default: false },
    alwaysShowRange: { type: Boolean, default: false },
  },
  emits: ["change"],
  setup(props, { emit }) {
    const selected = ref("TODAY");
    const dates = ref<[any, any]>([] as never);
    const dayjs = ref<any>();
    const options = () => [
      ["今日", "TODAY"],
      ["本周", "THIS_WEEK"],
      ["本月", "THIS_MONTH"],
      [props.trendMode ? "今年" : "全年", "THIS_YEAR"],
      ...(props.trendMode && !props.alwaysShowRange ? [["自定义", "CUSTOM"]] : []),
    ];
    const notify = (type: string): void => emit("change", { type, period: dates.value.map((item) => item.format(FORMAT)).join(",") });
    const selectPreset = (type: string): void => {
      if (!dayjs.value) return;
      selected.value = type;
      dates.value = type === "CUSTOM" ? [dayjs.value().subtract(29, "day").startOf("day"), dayjs.value()] : dateRange(dayjs.value, type);
      notify(type === "CUSTOM" ? "DAY" : type);
    };
    const updateDates = (value: [Dayjs, Dayjs] | null): void => {
      if (!value?.[0] || !value?.[1]) return;
      if (!dayjs.value) return;
      const now = dayjs.value();
      let start = value[0];
      let end = value[1].isAfter(now) ? now : value[1];
      if (props.trendMode && end.startOf("day").diff(start.startOf("day"), "day") > 29) {
        start = end.subtract(29, "day").startOf("day");
      }
      dates.value = [start.startOf("day"), end.isSame(now, "day") ? now : end.endOf("day")];
      selected.value = props.trendMode ? "CUSTOM" : "";
      notify(props.trendMode ? "DAY" : selected.value);
    };
    onMounted(async () => {
      dayjs.value = (await loadSecurityPcUi()).dayjs;
      dates.value = dateRange(dayjs.value, "TODAY");
      notify("TODAY");
    });
    return () => (
      <Space v-show={Boolean(dayjs.value)} size={8}>
        {options().map(([label, value]) => (
          <Button type={selected.value === value ? "primary" : "default"} onClick={() => selectPreset(value)}>
            {label}
          </Button>
        ))}
        {!props.trendMode || props.alwaysShowRange || selected.value === "CUSTOM" ? (
          <RangePicker
            value={dates.value}
            showTime
            allowClear={false}
            format={FORMAT}
            style={props.alwaysShowRange ? { width: "400px" } : undefined}
            disabledDate={(current: any) => current?.isAfter(dayjs.value().endOf("day"))}
            onChange={updateDates}
          />
        ) : null}
      </Space>
    );
  },
});

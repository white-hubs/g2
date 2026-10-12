import { type PropType, computed, defineComponent } from "vue";

import { RangePicker } from "@/pc-ui-runtime";

export interface TimeRangeFilterOption {
  label: string;
  value: string;
}

export interface TimeRangeFilterValue {
  timeRange?: string;
  startTime?: string;
  endTime?: string;
}

export const TimeRangeFilter = defineComponent({
  name: "TimeRangeFilter",
  props: {
    value: { type: Object as PropType<TimeRangeFilterValue>, required: true },
    options: { type: Array as PropType<TimeRangeFilterOption[]>, required: true },
    customLabel: { type: String, default: "自定义" },
    onChange: { type: Function as PropType<(value: TimeRangeFilterValue) => void>, required: true },
  },
  setup: (props) => {
    const isCustom = computed(() => Boolean(props.value.startTime || props.value.endTime));

    const customRange = computed<[string, string]>(() => [props.value.startTime ?? "", props.value.endTime ?? ""]);

    const choosePreset = (timeRange: string): void => {
      props.onChange({ timeRange });
    };

    const chooseCustomRange = (range?: [string, string] | string[]): void => {
      const [startTime, endTime] = range ?? [];
      if (!startTime || !endTime) {
        return;
      }
      props.onChange({ startTime, endTime });
    };

    return () => (
      <div class="hazard-time-range-filter" aria-label="时间范围筛选">
        <div class="hazard-time-range-filter-presets">
          {props.options.map((option) => (
            <button
              class={!isCustom.value && props.value.timeRange === option.value ? "is-active" : ""}
              type="button"
              key={option.value}
              onClick={() => choosePreset(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div class={["hazard-time-range-filter-custom", isCustom.value ? "is-active" : ""].join(" ")}>
          <span>{props.customLabel}</span>
          <RangePicker
            allowClear={false}
            value={customRange.value}
            valueFormat="YYYY-MM-DD"
            format="YYYY-MM-DD"
            placeholder={["开始日期", "结束日期"]}
            onChange={(_value, dateStrings) => chooseCustomRange(dateStrings as [string, string])}
          />
        </div>
      </div>
    );
  },
});

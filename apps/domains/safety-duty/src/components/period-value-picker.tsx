import { computed, defineComponent } from "vue";
import type { JSX } from "vue/jsx-runtime";

import { getDayjs, AntDatePicker as DatePicker, Select, SelectOption, Space } from "@/pc-ui-runtime";

interface PeriodPickerConfig {
  picker: "year" | "month";
  valueFormat: string;
  format: string;
  placeholder: string;
  width: string;
}

export interface PeriodRange {
  startTime: string;
  endTime: string;
  label: string;
}

const DATE_TIME_FORMAT = "YYYY-MM-DD HH:mm:ss";
const dayjs = getDayjs();

const QUARTER_OPTIONS = [
  { value: "1", label: "Q1" },
  { value: "2", label: "Q2" },
  { value: "3", label: "Q3" },
  { value: "4", label: "Q4" },
];

const periodPickerConfig = (periodType: string): PeriodPickerConfig => {
  if (periodType === "YEAR") {
    return {
      picker: "year",
      valueFormat: "YYYY",
      format: "YYYY",
      placeholder: "请选择年度",
      width: "120px",
    };
  }
  return {
    picker: "month",
    valueFormat: "YYYY-MM",
    format: "YYYY-MM",
    placeholder: "请选择月份",
    width: "150px",
  };
};

export const currentPeriodValue = (periodType: string): string => {
  if (periodType === "QUARTER") {
    return `${dayjs().format("YYYY")}-Q${Math.floor(dayjs().month() / 3) + 1}`;
  }
  return dayjs().format(periodPickerConfig(periodType).valueFormat);
};

const parseQuarterValue = (periodValue: string): { year: string; quarter: string } => {
  const match = /^(\d{4})-Q([1-4])$/.exec(periodValue);
  return {
    year: match?.[1] ?? dayjs().format("YYYY"),
    quarter: match?.[2] ?? String(Math.floor(dayjs().month() / 3) + 1),
  };
};

export const periodRangeFromValue = (periodType: string, periodValue: string): PeriodRange => {
  if (periodType === "YEAR") {
    const date = dayjs(periodValue || dayjs().format("YYYY"), "YYYY");
    return {
      startTime: date.startOf("year").format(DATE_TIME_FORMAT),
      endTime: date.endOf("year").format(DATE_TIME_FORMAT),
      label: `${date.format("YYYY")}年（${date.startOf("year").format("YYYY-MM-DD")} 至 ${date.endOf("year").format("YYYY-MM-DD")}）`,
    };
  }
  if (periodType === "QUARTER") {
    const { year, quarter } = parseQuarterValue(periodValue);
    const start = dayjs(`${year}-${String((Number(quarter) - 1) * 3 + 1).padStart(2, "0")}-01`);
    const end = start.add(2, "month").endOf("month");
    return {
      startTime: start.startOf("month").format(DATE_TIME_FORMAT),
      endTime: end.format(DATE_TIME_FORMAT),
      label: `${year}年Q${quarter}（${start.format("YYYY-MM-DD")} 至 ${end.format("YYYY-MM-DD")}）`,
    };
  }
  const date = dayjs(periodValue || dayjs().format("YYYY-MM"), "YYYY-MM");
  return {
    startTime: date.startOf("month").format(DATE_TIME_FORMAT),
    endTime: date.endOf("month").format(DATE_TIME_FORMAT),
    label: `${date.format("YYYY年MM月")}（${date.startOf("month").format("YYYY-MM-DD")} 至 ${date.endOf("month").format("YYYY-MM-DD")}）`,
  };
};

export const PeriodValuePicker = defineComponent({
  name: "PeriodValuePicker",
  props: {
    periodType: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      default: "",
    },
  },
  emits: {
    "update:value": (value: string) => typeof value === "string",
  },
  setup(props, { emit }) {
    const picker = computed(() => periodPickerConfig(props.periodType));
    const safeValue = computed(() => props.value || currentPeriodValue(props.periodType));
    const quarterParts = computed(() => parseQuarterValue(safeValue.value));

    const emitChange = (value?: string): void => {
      if (value) {
        emit("update:value", value);
      }
    };

    const updateQuarter = (next: { year?: string; quarter?: string }): void => {
      const current = quarterParts.value;
      emitChange(`${next.year ?? current.year}-Q${next.quarter ?? current.quarter}`);
    };

    return (): JSX.Element => {
      if (props.periodType === "QUARTER") {
        return (
          <Space size={8}>
            <DatePicker
              key="period-quarter-year"
              style={{ width: "120px" }}
              value={quarterParts.value.year}
              picker="year"
              valueFormat="YYYY"
              format="YYYY"
              placeholder="请选择年份"
              allowClear={false}
              onUpdate:value={(value) => updateQuarter({ year: String(value) })}
            />
            <Select
              style={{ width: "90px" }}
              value={quarterParts.value.quarter}
              onUpdate:value={(value) => updateQuarter({ quarter: String(value) })}
            >
              {QUARTER_OPTIONS.map((item) => (
                <SelectOption key={item.value} value={item.value}>
                  {item.label}
                </SelectOption>
              ))}
            </Select>
          </Space>
        );
      }
      return (
        <DatePicker
          key={`period-value-${props.periodType}`}
          style={{ width: picker.value.width }}
          value={safeValue.value}
          picker={picker.value.picker}
          valueFormat={picker.value.valueFormat}
          format={picker.value.format}
          placeholder={picker.value.placeholder}
          allowClear={false}
          onUpdate:value={(value) => emitChange(typeof value === "string" ? value : undefined)}
        />
      );
    };
  },
});

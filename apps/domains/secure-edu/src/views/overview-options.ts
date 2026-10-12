import type { PcChartOption } from "@g2-platform/pc-chart";

export interface DistributionDatum {
  name: string;
  value: number;
}

export interface AttendanceDatum {
  name: string;
  primary: number;
  secondary: number;
  tertiary: number;
}

export interface TrendDatum {
  name: string;
  value: number;
}

const colors = ["#1677ff", "#36cfc9", "#73d13d", "#ffc53d", "#ff7a45", "#9254de", "#5cdbd3", "#597ef7"];

export function buildTypeDistributionOption(exam: DistributionDatum[], training: DistributionDatum[]): PcChartOption {
  return {
    color: colors,
    tooltip: { trigger: "item", formatter: "{a}<br/>{b}：{c}（{d}%）" },
    legend: { type: "scroll", bottom: 0 },
    title: [
      { text: "考试类型", left: "25%", top: 8, textAlign: "center", textStyle: { fontSize: 14, fontWeight: "normal" } },
      { text: "培训类型", left: "75%", top: 8, textAlign: "center", textStyle: { fontSize: 14, fontWeight: "normal" } },
    ],
    series: [
      {
        name: "考试类型",
        type: "pie",
        radius: ["30%", "52%"],
        center: ["25%", "48%"],
        avoidLabelOverlap: true,
        label: { formatter: "{b}\n{d}%" },
        data: exam,
      },
      {
        name: "培训类型",
        type: "pie",
        radius: ["30%", "52%"],
        center: ["75%", "48%"],
        avoidLabelOverlap: true,
        label: { formatter: "{b}\n{d}%" },
        data: training,
      },
    ],
  };
}

export function buildThemeDistributionOption(data: DistributionDatum[], title: string): PcChartOption {
  return {
    color: colors,
    tooltip: { trigger: "item", formatter: `${title}<br/>{b}：{c}（{d}%）` },
    legend: { type: "scroll", orient: "vertical", right: 12, top: "middle" },
    series: [
      {
        name: title,
        type: "pie",
        radius: ["38%", "65%"],
        center: ["42%", "50%"],
        label: { formatter: "{b}\n{d}%" },
        data,
      },
    ],
  };
}

export function buildAttendanceOption(data: AttendanceDatum[], mode: "exam" | "training"): PcChartOption {
  const labels = mode === "exam" ? ["参加考试人数", "不及格人数", "缺考人数"] : ["参加培训人数", "缺勤人数", "迟到人数"];
  return {
    color: ["#1677ff", "#ffc53d", "#ff4d4f"],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { top: 0, data: labels },
    grid: { left: 48, right: 24, top: 48, bottom: 42 },
    xAxis: { type: "category", data: data.map((item) => item.name), axisLabel: { interval: 0, rotate: data.length > 8 ? 30 : 0 } },
    yAxis: { type: "value", minInterval: 1 },
    series: [
      { name: labels[0], type: "bar", barMaxWidth: 30, data: data.map((item) => item.primary) },
      { name: labels[1], type: "bar", barMaxWidth: 30, data: data.map((item) => item.secondary) },
      { name: labels[2], type: "bar", barMaxWidth: 30, data: data.map((item) => item.tertiary) },
    ],
  };
}

export function buildTrendOption(training: TrendDatum[], exam: TrendDatum[]): PcChartOption {
  const categories = [...new Set([...training.map((item) => item.name), ...exam.map((item) => item.name)])];
  const trainingMap = new Map(training.map((item) => [item.name, item.value]));
  const examMap = new Map(exam.map((item) => [item.name, item.value]));
  return {
    color: ["#1677ff", "#36cfc9"],
    tooltip: { trigger: "axis" },
    legend: { top: 0, data: ["培训专题数", "考试专题数"] },
    grid: { left: 48, right: 24, top: 48, bottom: 42 },
    xAxis: { type: "category", boundaryGap: false, data: categories },
    yAxis: { type: "value", minInterval: 1 },
    series: [
      {
        name: "培训专题数",
        type: "line",
        smooth: true,
        symbolSize: 7,
        areaStyle: { opacity: 0.08 },
        data: categories.map((name) => trainingMap.get(name) ?? 0),
      },
      {
        name: "考试专题数",
        type: "line",
        smooth: true,
        symbolSize: 7,
        areaStyle: { opacity: 0.08 },
        data: categories.map((name) => examMap.get(name) ?? 0),
      },
    ],
  };
}

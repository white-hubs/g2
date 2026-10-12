import * as echarts from "echarts";

export type PcChartOption = echarts.EChartsCoreOption;
export const CHART_THEME_EVENT = "g2:theme-change";

export interface PcChartHandle {
  setOption: (option: PcChartOption) => void;
  resize: () => void;
  dispose: () => void;
  onClick: (handler: (event: { name: string; dataIndex: number }) => void) => () => void;
}

type OptionRecord = Record<string, unknown>;

function themeColor(name: string, fallback: string): string {
  if (typeof document === "undefined") {
    return fallback;
  }
  return getComputedStyle(document.documentElement).getPropertyValue(`--g2-color-${name}`).trim() || fallback;
}

function themeAxis(axis: unknown, text: string, textSecondary: string, border: string, borderSecondary: string): unknown {
  if (Array.isArray(axis)) {
    return axis.map((item) => themeAxis(item, text, textSecondary, border, borderSecondary));
  }
  if (!axis || typeof axis !== "object") {
    return axis;
  }
  const source = axis as OptionRecord;
  return {
    ...source,
    axisLabel: { ...(source.axisLabel as OptionRecord), color: textSecondary },
    axisLine: {
      ...(source.axisLine as OptionRecord),
      lineStyle: { ...((source.axisLine as OptionRecord | undefined)?.lineStyle as OptionRecord), color: border },
    },
    splitLine: {
      ...(source.splitLine as OptionRecord),
      lineStyle: { ...((source.splitLine as OptionRecord | undefined)?.lineStyle as OptionRecord), color: borderSecondary },
    },
    nameTextStyle: { ...(source.nameTextStyle as OptionRecord), color: text },
  };
}

function themeTitle(title: unknown, text: string): unknown {
  if (Array.isArray(title)) {
    return title.map((item) => themeTitle(item, text));
  }
  if (!title || typeof title !== "object") {
    return title;
  }
  const source = title as OptionRecord;
  return { ...source, textStyle: { ...(source.textStyle as OptionRecord), color: text } };
}

function themeSeries(series: unknown, text: string, border: string, primary: string, primarySeries: Set<string>): unknown {
  if (!Array.isArray(series)) {
    return series;
  }
  return series.map((item) => {
    if (!item || typeof item !== "object") {
      return item;
    }
    const source = item as OptionRecord;
    const sourceItemStyle = source.itemStyle as OptionRecord | undefined;
    const color = typeof source.color === "string" && primarySeries.has(source.color.toLowerCase()) ? primary : source.color;
    const itemColor =
      typeof sourceItemStyle?.color === "string" && primarySeries.has(sourceItemStyle.color.toLowerCase())
        ? primary
        : sourceItemStyle?.color;
    return {
      ...source,
      ...(color === undefined ? {} : { color }),
      ...(sourceItemStyle ? { itemStyle: { ...sourceItemStyle, ...(itemColor === undefined ? {} : { color: itemColor }) } } : {}),
      label: { ...(source.label as OptionRecord), color: text },
      labelLine: {
        ...(source.labelLine as OptionRecord),
        lineStyle: { ...((source.labelLine as OptionRecord | undefined)?.lineStyle as OptionRecord), color: border },
      },
    };
  });
}

/**
 * ECharts 不读取 CSS 自定义属性。渲染前将宿主主题 Token 映射到图表文字、网格、提示框与主色系列。
 * 业务告警等级等语义色保持原值，只有已有蓝色的通用主系列映射到主题主色。
 */
export function applyChartTheme(option: PcChartOption): PcChartOption {
  const source = option as unknown as OptionRecord;
  const text = themeColor("text", "#1d2129");
  const textSecondary = themeColor("text-secondary", "#8c8c8c");
  const border = themeColor("border", "#d9d9d9");
  const borderSecondary = themeColor("border-secondary", "#edf0f5");
  const elevatedBg = themeColor("elevated-bg", "#ffffff");
  const primary = themeColor("primary", "#1890ff");
  const primarySeries = new Set(["#1890ff", "#1677ff", "#40a3ff", "#3662ec"]);
  const series = themeSeries(source.series, text, border, primary, primarySeries);

  return {
    ...source,
    backgroundColor: "transparent",
    textStyle: { ...(source.textStyle as OptionRecord), color: text },
    title: themeTitle(source.title, text),
    tooltip: {
      ...(source.tooltip as OptionRecord),
      backgroundColor: elevatedBg,
      borderColor: border,
      textStyle: { ...((source.tooltip as OptionRecord | undefined)?.textStyle as OptionRecord), color: text },
    },
    legend: {
      ...(source.legend as OptionRecord),
      textStyle: { ...((source.legend as OptionRecord | undefined)?.textStyle as OptionRecord), color: textSecondary },
    },
    xAxis: themeAxis(source.xAxis, text, textSecondary, border, borderSecondary),
    yAxis: themeAxis(source.yAxis, text, textSecondary, border, borderSecondary),
    series,
    // 未声明配色时不要写入 undefined，否则会覆盖 ECharts 的默认调色板。
    ...(Array.isArray(source.color)
      ? { color: source.color.map((value) => (typeof value === "string" && primarySeries.has(value.toLowerCase()) ? primary : value)) }
      : {}),
  } as PcChartOption;
}

/** 域侧图表句柄：封装 echarts，禁止域直依 echarts（G5）。 */
export function createPcChart(el: HTMLElement): PcChartHandle {
  const instance = echarts.init(el);
  return {
    onClick: (handler) => {
      const listener = (event: { name?: string; dataIndex?: number }) =>
        handler({ name: event.name ?? "", dataIndex: event.dataIndex ?? -1 });
      instance.on("click", listener);
      return () => instance.off("click", listener);
    },
    setOption: (option) => {
      instance.setOption(applyChartTheme(option));
    },
    resize: () => {
      instance.resize();
    },
    dispose: () => {
      instance.dispose();
    },
  };
}

import type {
  HazardDashboardChartsVO,
  HazardDashboardLevelDistributionVO,
  HazardDashboardOverdueItemVO,
  HazardDashboardRankingItemVO,
  HazardDashboardSourceDistributionVO,
  HazardDashboardSummaryVO,
} from "@g2-contract/hazard-governance";
import * as echarts from "echarts";
import { computed, defineComponent, markRaw, onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
import type { PropType } from "vue";

import { levelText } from "../shared/data";
import type { DashboardDimension } from "./use-dashboard-data";
import { normalizeDashboardPercent } from "./use-dashboard-data";
import { CheckCircleFilled, DownOutlined, StarFilled, WarningFilled } from "@/pc-ui-runtime";
import { resolveEchartsInitSize, scheduleEchartsMount } from "@/utils/echarts-chart-host";

const levelColors: Record<string, string> = {
  CRITICAL: "#f43f46",
  MAJOR: "#f59e0b",
  GENERAL: "#3278e8",
};

const dimensionOptions: Array<{ value: DashboardDimension; label: string; firstColumn: string }> = [
  { value: "risk-object", label: "按设备", firstColumn: "设备类型" },
  { value: "risk-unit", label: "按区域", firstColumn: "区域名称" },
  { value: "responsible-user", label: "按人员", firstColumn: "人员姓名" },
];

const getLevelColor = (item: HazardDashboardLevelDistributionVO, index: number): string => {
  const fallbackColors = ["#f43f46", "#f59e0b", "#3278e8", "#35bf67", "#7c3aed"];
  return levelColors[item.level ?? ""] ?? fallbackColors[index % fallbackColors.length];
};

const getSourceTone = (item: HazardDashboardSourceDistributionVO): "blue" | "green" => {
  return item.sourceType === "MANUAL" || item.sourceType === "INSPECTION" ? "green" : "blue";
};

const readOverdueField = (item: HazardDashboardOverdueItemVO, keys: string[]): string => {
  const record = item as HazardDashboardOverdueItemVO & Record<string, unknown>;
  const value = keys.map((key) => record[key]).find((candidate) => candidate !== undefined && candidate !== null && candidate !== "");
  return value === undefined || value === null ? "-" : String(value);
};

const getOverdueDays = (item: HazardDashboardOverdueItemVO): number => {
  if (typeof item.overdueDays === "number") return item.overdueDays;
  if (typeof item.overdueHours === "number") return Math.max(0, Math.ceil(item.overdueHours / 24));
  return 0;
};

const renderOverdueLevel = (level?: string): string => {
  return level ? (levelText[level as keyof typeof levelText] ?? level) : "-";
};

export function DashboardMetrics(props: { summary: HazardDashboardSummaryVO; closedRate: number }) {
  const metrics = [
    {
      label: "隐患总数",
      value: props.summary.totalCount ?? 0,
      hint: `截至当前累计 · 已闭环${props.summary.closedCount ?? 0}条`,
      tone: "blue",
    },
    { label: "闭环率", value: `${props.closedRate}%`, hint: "已闭环 / 总数", tone: "green" },
    { label: "超期未闭环", value: props.summary.overdueUnclosedCount ?? 0, hint: "需立即处理", tone: "red" },
    { label: "待办工单", value: props.summary.todoWorkOrderCount ?? 0, hint: "含审批/整改/验收", tone: "orange" },
  ];

  return (
    <div class="dashboard-metric-grid">
      {metrics.map((metric) => (
        <div class={["dashboard-metric-card", `dashboard-metric-${metric.tone}`]} key={metric.label}>
          <span class="dashboard-metric-label">{metric.label}</span>
          <span class="dashboard-metric-badge" aria-hidden="true" />
          <strong>{metric.value}</strong>
          <small>{metric.hint}</small>
        </div>
      ))}
    </div>
  );
}

export function OverdueBanner(props: { summary: HazardDashboardSummaryVO; expanded: boolean; onToggle: () => void }) {
  const overdueItems = props.summary.overdueItems ?? [];
  return (
    <section class={["dashboard-overdue-panel", props.expanded ? "is-expanded" : ""].join(" ")}>
      <button class="dashboard-overdue-banner" type="button" aria-expanded={props.expanded} onClick={props.onToggle}>
        <span>
          <WarningFilled /> 超期未闭环： {props.summary.overdueUnclosedCount ?? 0}条 | 最严重超期： {props.summary.maxOverdueDays ?? 0}天
        </span>
        <DownOutlined class="dashboard-overdue-toggle" />
      </button>
      {props.expanded ? (
        <div class="dashboard-overdue-detail">
          {overdueItems.length ? (
            <table class="dashboard-overdue-table">
              <thead>
                <tr>
                  <th>隐患编号</th>
                  <th>描述</th>
                  <th>等级</th>
                  <th>超期天数</th>
                  <th>责任人</th>
                </tr>
              </thead>
              <tbody>
                {overdueItems.map((item, index) => (
                  <tr key={String(item.hazardId ?? item.code ?? index)}>
                    <td>{item.code || item.hazardId}</td>
                    <td>{item.description || "-"}</td>
                    <td>{renderOverdueLevel(item.level)}</td>
                    <td>
                      <strong>{getOverdueDays(item)}天</strong>
                    </td>
                    <td>
                      {readOverdueField(item, ["responsibleUserName", "responsibleName", "ownerName", "responsibleUserId", "ownerId"])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div class="dashboard-overdue-empty">暂无超期未闭环隐患</div>
          )}
        </div>
      ) : null}
    </section>
  );
}

export const DashboardCharts = defineComponent({
  name: "DashboardCharts",
  props: {
    total: { type: Number, required: true },
    charts: { type: Object as PropType<HazardDashboardChartsVO>, required: true },
    loading: { type: Boolean, required: true },
    timeLabel: { type: String, required: true },
  },
  setup: (props) => {
    const levelChartRef = shallowRef<HTMLDivElement | null>(null);
    const trendChartRef = shallowRef<HTMLDivElement | null>(null);
    const levelChart = shallowRef<echarts.ECharts | null>(null);
    const trendChart = shallowRef<echarts.ECharts | null>(null);
    type ChartRef = typeof levelChart;
    let resizeFrame: number | null = null;

    const levelDistribution = computed(() => props.charts.levelDistribution ?? []);
    const closureTrend = computed(() => props.charts.closureTrend ?? []);

    const getLevelOption = (): echarts.EChartsOption => {
      const data = levelDistribution.value.map((item, index) => ({
        name: item.label ?? item.level ?? "未分类",
        value: item.count ?? 0,
        itemStyle: { color: getLevelColor(item, index) },
      }));
      const isEmpty = data.length === 0;
      return {
        color: levelDistribution.value.map(getLevelColor),
        title: isEmpty
          ? {
              text: props.loading ? "加载中..." : "暂无等级分布",
              left: "center",
              top: "middle",
              textStyle: { color: "#8a93a3", fontSize: 14, fontWeight: 400 },
            }
          : {
              text: `${props.total}`,
              subtext: "隐患总数",
              left: "49%",
              top: "35%",
              textAlign: "center",
              textVerticalAlign: "middle",
              textStyle: { color: "#111827", fontSize: 28, fontWeight: 700 },
              subtextStyle: { color: "#8a93a3", fontSize: 12 },
            },
        tooltip: {
          trigger: "item",
          formatter: (params) => {
            const item = params as { marker?: string; name?: string; value?: number; percent?: number };
            return `${item.marker ?? ""}${item.name ?? "未分类"}<br/>数量：${item.value ?? 0}<br/>占比：${normalizeDashboardPercent(item.percent)}%`;
          },
        },
        legend: {
          bottom: 0,
          left: "center",
          itemWidth: 11,
          itemHeight: 11,
          textStyle: { color: "#4b5563", fontSize: 12 },
          formatter: (name) => {
            const item = levelDistribution.value.find((entry) => (entry.label ?? entry.level ?? "未分类") === name);
            return `${name} ${normalizeDashboardPercent(item?.percent)}%`;
          },
        },
        series: [
          {
            type: "pie",
            radius: ["48%", "70%"],
            center: ["50%", "44%"],
            avoidLabelOverlap: true,
            label: { show: false },
            labelLine: { show: false },
            data,
            silent: isEmpty,
          },
        ],
      };
    };

    const getTrendOption = (): echarts.EChartsOption => {
      const labels = closureTrend.value.map((item) => item.label ?? item.bucket ?? "-");
      const rates = closureTrend.value.map((item) => normalizeDashboardPercent(item.closedRate));
      const isEmpty = rates.length === 0;
      return {
        title: isEmpty
          ? {
              text: props.loading ? "加载中..." : "暂无趋势数据",
              left: "center",
              top: "middle",
              textStyle: { color: "#8a93a3", fontSize: 14, fontWeight: 400 },
            }
          : undefined,
        grid: { top: 22, right: 18, bottom: 42, left: 44 },
        tooltip: {
          trigger: "axis",
          valueFormatter: (value) => `${normalizeDashboardPercent(Number(value))}%`,
        },
        xAxis: {
          type: "category",
          boundaryGap: true,
          data: labels,
          axisTick: { show: false },
          axisLine: { lineStyle: { color: "#edf0f5" } },
          axisLabel: { color: "#8a93a3", interval: "auto", hideOverlap: true },
        },
        yAxis: {
          type: "value",
          min: 0,
          max: 100,
          axisLabel: { color: "#8a93a3", formatter: "{value}%" },
          splitLine: { lineStyle: { color: "#edf0f5", type: "dashed" } },
        },
        series: [
          {
            name: "闭环率",
            type: "bar",
            data: rates,
            barMaxWidth: 34,
            label: {
              show: true,
              position: "top",
              color: "#1f2937",
              fontSize: 12,
              formatter: ({ value }) => {
                const rate = normalizeDashboardPercent(Number(value));
                return rate > 0 ? `${rate}%` : "";
              },
            },
            labelLayout: { hideOverlap: true },
            itemStyle: {
              borderRadius: [5, 5, 0, 0],
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "#35bf67" },
                { offset: 1, color: "#3278e8" },
              ]),
            },
          },
        ],
      };
    };

    const getTrendHint = (): string => {
      const rates = closureTrend.value.map((item) => normalizeDashboardPercent(item.closedRate));
      if (rates.length === 0) return "";
      const latestRate = rates[rates.length - 1] ?? 0;
      const maxRate = Math.max(...rates);
      if (maxRate === 0) {
        return `${props.timeLabel}闭环率暂无变化`;
      }
      return `${props.timeLabel}闭环率峰值 ${maxRate}% · 最新 ${latestRate}%`;
    };

    const ensureChart = (el: HTMLDivElement | null, chart: ChartRef, minHeight: number): echarts.ECharts | null => {
      if (!el) return null;
      if (!chart.value || chart.value.isDisposed()) {
        chart.value = markRaw(echarts.init(el, undefined, resolveEchartsInitSize(el, minHeight)));
      }
      return chart.value;
    };

    const renderCharts = (): void => {
      ensureChart(levelChartRef.value, levelChart, 240)?.setOption(getLevelOption(), true);
      ensureChart(trendChartRef.value, trendChart, 220)?.setOption(getTrendOption(), true);
    };

    const disposeChart = (chart: ChartRef): void => {
      if (chart.value && !chart.value.isDisposed()) {
        chart.value.dispose();
      }
      chart.value = null;
    };

    const disposeCharts = (): void => {
      disposeChart(levelChart);
      disposeChart(trendChart);
    };

    const reinitCharts = (): void => {
      disposeCharts();
      renderCharts();
    };

    const handleResize = (): void => {
      if (resizeFrame != null) {
        cancelAnimationFrame(resizeFrame);
      }
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        reinitCharts();
      });
    };

    onMounted(() => {
      scheduleEchartsMount(renderCharts);
      window.addEventListener("resize", handleResize);
    });

    onBeforeUnmount(() => {
      window.removeEventListener("resize", handleResize);
      if (resizeFrame != null) {
        cancelAnimationFrame(resizeFrame);
      }
      disposeCharts();
    });

    watch(
      () => [props.total, props.timeLabel, props.loading, props.charts],
      () => {
        renderCharts();
      },
      { deep: true },
    );

    return () => (
      <div class="dashboard-chart-grid">
        <section class="dashboard-panel">
          <h3>隐患等级分布</h3>
          <div ref={levelChartRef} class="dashboard-echarts dashboard-level-chart" />
        </section>
        <section class="dashboard-panel dashboard-trend-panel">
          <h3>
            闭环率趋势 <small>（{props.timeLabel}）</small>
          </h3>
          <div ref={trendChartRef} class="dashboard-echarts dashboard-trend-chart" />
          {closureTrend.value.length > 0 ? <div class="dashboard-trend-hint">{getTrendHint()}</div> : null}
        </section>
      </div>
    );
  },
});

export function HazardSourceDistribution(props: { charts: HazardDashboardChartsVO; loading: boolean }) {
  const sources = props.charts.sourceDistribution ?? [];
  return (
    <section class="dashboard-panel dashboard-source-panel">
      <h3>隐患来源分布</h3>
      <div class="dashboard-source-grid">
        {sources.map((source, index) => {
          const tone = getSourceTone(source);
          const percent = normalizeDashboardPercent(source.percent);
          const note =
            source.sourceSystemCount != null
              ? `覆盖 ${source.sourceSystemCount} 个上游应用`
              : source.sourceEventCount != null
                ? `覆盖 ${source.sourceEventCount} 种上报方式`
                : source.sourceType || "";
          return (
            <div class={["dashboard-source-card", `dashboard-source-${tone}`]} key={source.sourceType ?? `${source.label}-${index}`}>
              <strong class="dashboard-source-title">
                {tone === "blue" ? <StarFilled /> : <CheckCircleFilled />} {source.label ?? source.sourceType ?? "未知来源"}
              </strong>
              <b>{source.count ?? 0}</b>
              <span>{note}</span>
              <div class="dashboard-source-track">
                <i style={{ width: `${percent}%` }} />
              </div>
              <small>占总量的 {percent}%</small>
            </div>
          );
        })}
        {!props.loading && sources.length === 0 ? <div class="dashboard-chart-empty">暂无来源分布</div> : null}
      </div>
    </section>
  );
}

export function HazardRankingTable(props: {
  dimension: DashboardDimension;
  items: HazardDashboardRankingItemVO[];
  loading: boolean;
  onDimensionChange: (dimension: DashboardDimension) => void;
}) {
  const firstColumn = dimensionOptions.find((item) => item.value === props.dimension)?.firstColumn ?? "维度名称";
  return (
    <section class="dashboard-panel dashboard-ranking-panel">
      <div class="dashboard-ranking-tabs">
        {dimensionOptions.map((option) => (
          <button
            class={props.dimension === option.value ? "is-active" : ""}
            type="button"
            key={option.value}
            onClick={() => props.onDimensionChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div class="dashboard-ranking-scroll">
        <table class="dashboard-ranking-table">
          <thead>
            <tr>
              <th>{firstColumn}</th>
              <th>隐患数量</th>
              <th>占比</th>
              <th>风险评分</th>
              <th>趋势</th>
              <th>闭环率</th>
            </tr>
          </thead>
          <tbody>
            {props.items.map((item, index) => (
              <tr key={item.id ?? `${item.name}-${index}`}>
                <td>{item.name || "未命名"}</td>
                <td>
                  <strong>{item.hazardCount ?? 0}</strong>
                </td>
                <td>{normalizeDashboardPercent(item.percent)}%</td>
                <td>{item.riskScore ?? 0}</td>
                <td class={(item.trend ?? 0) > 0 ? "is-up" : "is-down"}>
                  {(item.trend ?? 0) > 0 ? "↑" : (item.trend ?? 0) < 0 ? "↓" : "—"}
                  {Math.abs(item.trend ?? 0) || ""}
                </td>
                <td class="is-rate">{normalizeDashboardPercent(item.closedRate)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {props.loading ? <div class="dashboard-ranking-empty">加载中...</div> : null}
        {!props.loading && props.items.length === 0 ? <div class="dashboard-ranking-empty">暂无排行数据</div> : null}
      </div>
    </section>
  );
}

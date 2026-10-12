import type { ChartItemVO, HotEventVO, StatisticsOverviewVO } from "@g2-contract/security-opinion";
import { Card } from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import * as echarts from "echarts";
import type { ECharts } from "echarts";
import { defineComponent, onActivated, onMounted, onUnmounted, ref } from "vue";

import { securityOpinionApi } from "../../api/security-opinion";
import { PageShell } from "../../components/page-shell/page-shell";
import { usePageName } from "../../utils/page-name";

import styles from "./statistics.module.css";

const SENTIMENT_COLORS: Record<string, string> = {
  正面: "#0d9488",
  中性: "#3b82f6",
  负面: "#ef4444",
  未知: "#94a3b8",
};
const RANK_COLORS = ["#fbbf24", "#94a3b8", "#cd7f32"];

export const StatisticsPage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const overview = ref<StatisticsOverviewVO>({ total: 0, negativeCount: 0, sourceCount: 0, negativeRate: 0 });
    const hotEvents = ref<HotEventVO[]>([]);

    const sentimentRef = ref<HTMLDivElement | null>(null);
    const sourceRef = ref<HTMLDivElement | null>(null);
    const trendRef = ref<HTMLDivElement | null>(null);
    const keywordRef = ref<HTMLDivElement | null>(null);

    let charts: ECharts[] = [];
    let initialized = false;

    const renderChart = (el: HTMLDivElement | null, option: echarts.EChartsOption): ECharts | null => {
      if (!el) return null;
      const chart = echarts.init(el);
      chart.setOption(option);
      return chart;
    };

    const buildSentimentOption = (data: ChartItemVO[]): echarts.EChartsOption => ({
      tooltip: { trigger: "item", formatter: "{b}: {c}条 ({d}%)" },
      legend: { bottom: 0, textStyle: { color: "#64748b", fontSize: 12 } },
      series: [
        {
          type: "pie",
          radius: ["45%", "70%"],
          center: ["50%", "45%"],
          itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 2 },
          label: { show: true, formatter: "{b}\n{c}条", fontSize: 12 },
          data: data.map((d) => ({
            value: d.value,
            name: d.name,
            itemStyle: { color: SENTIMENT_COLORS[d.name] ?? "#64748b" },
          })),
        },
      ],
    });

    const buildBarOption = (data: ChartItemVO[], horizontal = false): echarts.EChartsOption => {
      if (horizontal) {
        const names = data.map((d) => d.name).toReversed();
        const values = data.map((d) => d.value).toReversed();
        return {
          tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
          grid: { left: 100, right: 30, top: 10, bottom: 20 },
          xAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#f1f5f9" } } },
          yAxis: { type: "category", data: names },
          series: [{ type: "bar", data: values, barWidth: 18, itemStyle: { borderRadius: [0, 4, 4, 0], color: "#3b82f6" } }],
        };
      }
      return {
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        grid: { left: 60, right: 20, top: 10, bottom: 30 },
        xAxis: { type: "category", data: data.map((d) => d.name) },
        yAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#f1f5f9" } } },
        series: [
          {
            type: "bar",
            data: data.map((d) => d.value),
            barWidth: 36,
            itemStyle: { color: "#0d9488", borderRadius: [4, 4, 0, 0] },
          },
        ],
      };
    };

    const buildTrendOption = (data: ChartItemVO[]): echarts.EChartsOption => ({
      tooltip: { trigger: "axis" },
      grid: { left: 50, right: 20, top: 10, bottom: 30 },
      xAxis: {
        type: "category",
        data: data.map((d) => d.name.split(" ")[1] ?? d.name),
      },
      yAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#f1f5f9" } } },
      series: [
        {
          type: "line",
          data: data.map((d) => d.value),
          smooth: true,
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { color: "#0d9488", width: 2.5 },
          itemStyle: { color: "#0d9488" },
          areaStyle: { color: "rgba(13,148,136,0.15)" },
        },
      ],
    });

    const loadData = async (): Promise<void> => {
      const [ov, sentiment, sources, trend, keywords, events] = await Promise.all([
        securityOpinionApi.getStatisticsOverview(),
        securityOpinionApi.getSentimentDistribution(),
        securityOpinionApi.getSourceDistribution(),
        securityOpinionApi.getCollectionTrend(),
        securityOpinionApi.getKeywordRanking(),
        securityOpinionApi.getHotEvents(),
      ]);
      overview.value = ov;
      hotEvents.value = events;

      if (!initialized) {
        charts = [
          renderChart(sentimentRef.value, buildSentimentOption(sentiment)),
          renderChart(sourceRef.value, buildBarOption(sources)),
          renderChart(trendRef.value, buildTrendOption(trend)),
          renderChart(keywordRef.value, buildBarOption(keywords, true)),
        ].filter((c): c is ECharts => c !== null);
        initialized = true;
      } else {
        charts[0]?.setOption(buildSentimentOption(sentiment), true);
        charts[1]?.setOption(buildBarOption(sources), true);
        charts[2]?.setOption(buildTrendOption(trend), true);
        charts[3]?.setOption(buildBarOption(keywords, true), true);
      }
    };

    const onResize = (): void => {
      charts.forEach((c) => {
        c.resize();
      });
    };

    onMounted(() => {
      void loadData();
      window.addEventListener("resize", onResize);
    });

    onActivated(() => {
      if (initialized) void loadData();
    });

    onUnmounted(() => {
      window.removeEventListener("resize", onResize);
      charts.forEach((c) => {
        c.dispose();
      });
      charts = [];
    });

    const statCards = [
      { label: "舆情总数", value: () => overview.value.total, sub: "所有采集数据" },
      { label: "负面数量", value: () => overview.value.negativeCount, sub: "需重点关注" },
      { label: "信源数量", value: () => overview.value.sourceCount, sub: "活跃信源" },
      { label: "负面占比", value: () => `${overview.value.negativeRate}%`, sub: "风险指标" },
    ];

    return () => (
      <PageShell
        title={pageTitle.value}
        showFooter={false}
        v-slots={{
          "layout-content": () => (
            <div class={styles.page}>
              <div class={styles.statGrid}>
                {statCards.map((c) => (
                  <Card key={c.label} class={styles.statCard}>
                    <div class={styles.statLabel}>{c.label}</div>
                    <div class={styles.statValue}>{c.value()}</div>
                    <div class={styles.statSub}>{c.sub}</div>
                  </Card>
                ))}
              </div>

              <div class={styles.chartGrid}>
                <Card title="情感分布" class={styles.chartCard}>
                  <div ref={sentimentRef} class={styles.chartBox} />
                </Card>
                <Card title="信源分布" class={styles.chartCard}>
                  <div ref={sourceRef} class={styles.chartBox} />
                </Card>
                <Card title="采集时间趋势" class={styles.chartCard}>
                  <div ref={trendRef} class={styles.chartBox} />
                </Card>
                <Card title="高频关键词排行" class={styles.chartCard}>
                  <div ref={keywordRef} class={styles.chartBox} />
                </Card>
              </div>

              <Card title="热点事件排行" class={styles.hotCard}>
                {hotEvents.value.map((evt, idx) => (
                  <div key={evt.rank} class={styles.hotItem}>
                    <div class={styles.hotRow}>
                      <span
                        class={styles.rankBadge}
                        style={{ background: idx < 3 ? RANK_COLORS[idx] : "#f1f5f9", color: idx < 3 ? "#fff" : "#64748b" }}
                      >
                        {evt.rank}
                      </span>
                      <span class={styles.hotTitle} title={evt.title}>
                        {evt.title}
                      </span>
                    </div>
                    <div class={styles.hotChannel}>{evt.channelText}</div>
                  </div>
                ))}
              </Card>
            </div>
          ),
        }}
      />
    );
  },
});

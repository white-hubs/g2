// @ts-nocheck — statistics payloads differ slightly between deployed backend versions.
import { computed, defineComponent, onBeforeUnmount, onMounted, reactive, ref } from "vue";

import { getSecurityAlarmClient, getSecurityMonitorClient } from "../domain-context";
import ChartPanel from "./chart-panel";
import { normalizePage, normalizeRecord, type SecurityRecord } from "./data";
import { defineAsyncSecurityPcUiComponent, showSecurityPcUiError } from "./pc-ui-runtime";
import TimeRangeSelector from "./time-range-selector";

import styles from "./security-monitor.module.css";

const APPLICATION_CODE = "SECURITY_MONITORING";
const THEME_EVENT = "g2:theme-change";
const LEVEL_COLORS: Record<string, string> = {
  one_level: "#F53F3F",
  two_level: "#FBA33F",
  three_level: "#3662EC",
  four_level: "#00BA8B",
};
const STATUS_ITEMS = [
  { key: "ALARM_UN_CONFIRMED", label: "待接收", color: "var(--cube-theme-var--primary-color, #1890ff)" },
  { key: "ALARM_SUSPEND", label: "已挂起", color: "#FBA33F" },
  { key: "ALARM_PROGRESS_CONFIRMED", label: "处理中", color: "#3662EC" },
  { key: "ALARM_HANDLER", label: "已处理", color: "#00BA8B" },
];

const Card = defineAsyncSecurityPcUiComponent("Card");
const Empty = defineAsyncSecurityPcUiComponent("Empty");
const PageLayout = defineAsyncSecurityPcUiComponent("PageLayout");
const Spin = defineAsyncSecurityPcUiComponent("Spin");

const asRows = (raw: unknown): SecurityRecord[] => normalizePage(raw).records;
const num = (value: unknown): number => Number(value ?? 0) || 0;
const chartRows = (raw: unknown): SecurityRecord[] => {
  const page = asRows(raw);
  if (page.length) return page;
  const record = normalizeRecord(raw);
  return Array.isArray(record.alarmCurrencyStatisticsVOS) ? record.alarmCurrencyStatisticsVOS : [];
};
const ratioText = (value: unknown): string => `${num(value)}%`;
const randomColor = (index: number): string => ["#3662EC", "#40A3FF", "#00BA8B", "#FBA33F", "#F53F3F", "#722ED1"][index % 6] ?? "#3662EC";

export default defineComponent({
  name: "SecurityMonitorOverviewPage",
  setup() {
    const loading = ref(false);
    const periodType = ref("TODAY");
    const period = ref("");
    // ECharts 不会读取 CSS 变量；用主题事件重新计算 option，确保切换主题后图表立即重绘。
    const themeRevision = ref(0);
    const onThemeChange = () => {
      themeRevision.value += 1;
    };
    onMounted(() => {
      window.addEventListener(THEME_EVENT, onThemeChange);
    });
    onBeforeUnmount(() => window.removeEventListener(THEME_EVENT, onThemeChange));
    const state = reactive({
      abnormalPatrol: {} as SecurityRecord,
      alarmStatistic: {} as SecurityRecord,
      alarmStatusGroup: [] as SecurityRecord[],
      alarmLevels: [] as SecurityRecord[],
      patrolLines: [] as SecurityRecord[],
      alarmAreas: [] as SecurityRecord[],
      alarmTrend: [] as SecurityRecord[],
    });

    const query = (): Record<string, unknown> => ({
      applicationCode: APPLICATION_CODE,
      type: periodType.value,
      period: period.value,
    });

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const [alarm, monitor] = await Promise.all([getSecurityAlarmClient(), getSecurityMonitorClient()]);
        const [patrolTotalRaw, alarmTotalRaw, statusRaw, levelRaw, patrolLineRaw, areaRaw, trendRaw] = await Promise.all([
          monitor.getPatrolAbnormalSummary({
            period: period.value,
            type: periodType.value,
          }),
          alarm.getAlarmTotalStatistic(query()),
          alarm.getAlarmStatusGroupStatistics(query()),
          alarm.getAlarmLevelStatistic(query()),
          monitor.getPatrolAbnormalGroup({
            period: period.value,
            type: periodType.value,
          }),
          alarm.getAlarmAreaStatistic(query()),
          alarm.getAlarmTrendAnalysis(query()),
        ]);

        state.abnormalPatrol = normalizeRecord(patrolTotalRaw);
        state.alarmStatistic = normalizeRecord(alarmTotalRaw);
        state.alarmStatusGroup = asRows(statusRaw);
        state.alarmLevels = asRows(levelRaw);
        state.patrolLines = asRows(patrolLineRaw);
        state.alarmAreas = asRows(areaRaw);
        state.alarmTrend = chartRows(trendRaw);
      } catch (error) {
        await showSecurityPcUiError(error, "总览数据加载失败");
      } finally {
        loading.value = false;
      }
    };

    const alarmStatusNum = (key: string): number =>
      num(state.alarmStatusGroup.find((item) => String(item.alarmStatus ?? item.code) === key)?.alarmNum);

    const chartTokens = () => {
      void themeRevision.value;
      const computedStyles = getComputedStyle(document.documentElement);
      const color = (name: string, fallback: string) => computedStyles.getPropertyValue(`--g2-color-${name}`).trim() || fallback;
      return {
        primary: color("primary", "#1890ff"),
        primaryHover: color("primary-hover", "#40a9ff"),
        primarySoft: color("primary-soft", "#e6f7ff"),
        elevatedBg: color("elevated-bg", "#ffffff"),
        border: color("border", "#d9d9d9"),
        borderSecondary: color("border-secondary", "#edf0f5"),
        text: color("text", "#1d2129"),
        textSecondary: color("text-secondary", "#8c8c8c"),
      };
    };

    const pieOption = (rows: SecurityRecord[], name: string, valueKey: string) => {
      const tokens = chartTokens();
      return {
        backgroundColor: "transparent",
        textStyle: { color: tokens.text },
        tooltip: { trigger: "item", backgroundColor: tokens.elevatedBg, borderColor: tokens.border, textStyle: { color: tokens.text } },
        legend: { bottom: 0, type: "scroll", textStyle: { color: tokens.textSecondary } },
        color: rows.map((row, index) => String(row.color ?? LEVEL_COLORS[String(row.code ?? "")] ?? randomColor(index))),
        series: [
          {
            name,
            type: "pie",
            radius: ["48%", "70%"],
            center: ["50%", "45%"],
            label: { formatter: "{b}  {c}", color: tokens.text },
            data: rows.map((row) => ({
              name: String(row.name ?? row.areaName ?? row.code ?? "--"),
              value: num(row[valueKey] ?? row.alarmNum ?? row.totalNum ?? row.value),
            })),
          },
        ],
      };
    };

    const patrolLineOption = computed(() => ({
      ...(() => {
        const tokens = chartTokens();
        return {
          backgroundColor: "transparent",
          textStyle: { color: tokens.text },
          tooltip: { trigger: "axis", backgroundColor: tokens.elevatedBg, borderColor: tokens.border, textStyle: { color: tokens.text } },
          xAxis: {
            type: "category",
            data: state.patrolLines.map((row) => String(row.name ?? "")),
            axisLine: { lineStyle: { color: tokens.border } },
            axisLabel: { color: tokens.textSecondary },
          },
          yAxis: {
            type: "value",
            minInterval: 1,
            splitLine: { lineStyle: { color: tokens.borderSecondary } },
            axisLabel: { color: tokens.textSecondary },
          },
        };
      })(),
      grid: { left: 42, right: 22, top: 28, bottom: 38 },
      series: [
        {
          type: "bar",
          barWidth: 20,
          color: chartTokens().primary,
          data: state.patrolLines.map((row) => num(row.totalNum ?? row.abnormalNum ?? row.value)),
        },
      ],
    }));

    const alarmTrendOption = computed(() => ({
      ...(() => {
        const tokens = chartTokens();
        return {
          backgroundColor: "transparent",
          textStyle: { color: tokens.text },
          tooltip: { trigger: "axis", backgroundColor: tokens.elevatedBg, borderColor: tokens.border, textStyle: { color: tokens.text } },
          xAxis: {
            type: "category",
            boundaryGap: false,
            data: state.alarmTrend.map((row) => String(row.period ?? row.name ?? "")),
            axisLine: { lineStyle: { color: tokens.border } },
            axisLabel: { color: tokens.textSecondary },
          },
          yAxis: {
            type: "value",
            minInterval: 1,
            splitLine: { lineStyle: { color: tokens.borderSecondary } },
            axisLabel: { color: tokens.textSecondary },
          },
        };
      })(),
      grid: { left: 42, right: 22, top: 28, bottom: 38 },
      series: [
        {
          type: "line",
          smooth: true,
          symbol: "circle",
          color: chartTokens().primaryHover,
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: chartTokens().primarySoft },
                { offset: 1, color: "transparent" },
              ],
            },
          },
          data: state.alarmTrend.map((row) => num(row.alarmNum ?? row.totalNum ?? row.value)),
        },
      ],
    }));

    const statSuffix = (ratio: unknown) => {
      const value = num(ratio);
      return (
        <span class={styles.overviewRatio}>
          <span>环比</span>
          {value > 0 ? <span class={styles.overviewRatioUp}>↑</span> : null}
          {value < 0 ? <span class={styles.overviewRatioDown}>↓</span> : null}
          <span>{ratioText(value)}</span>
        </span>
      );
    };

    const slots = {
      "layout-header": () => (
        <TimeRangeSelector
          onChange={({ type, period: value }: { type: string; period: string }) => {
            periodType.value = type;
            period.value = value;
            void load();
          }}
        />
      ),
      "layout-content": () => (
        <Spin spinning={loading.value}>
          <div class={styles.overviewLegacyGrid}>
            <div class={`${styles.overviewStatisticCard} ${styles.overviewPatrolStatistic}`}>
              <div class={`${styles.overviewStatisticIcon} ${styles.overviewStatisticIconOrange}`}>巡</div>
              <div class={styles.overviewStatisticBody}>
                <span>巡逻异常数</span>
                <strong>{num(state.abnormalPatrol.totalNum ?? state.abnormalPatrol.abnormalNum)}</strong>
                {statSuffix(state.abnormalPatrol.ringRatio)}
              </div>
            </div>
            <div class={`${styles.overviewStatisticCard} ${styles.overviewAlarmStatistic}`}>
              <div class={styles.overviewAlarmStatisticLeft}>
                <div class={`${styles.overviewStatisticIcon} ${styles.overviewStatisticIconRed}`}>警</div>
                <div class={styles.overviewStatisticBody}>
                  <span>报警总数</span>
                  <strong>{num(state.alarmStatistic.alarmNum ?? state.alarmStatistic.totalNum)}</strong>
                  {statSuffix(state.alarmStatistic.ringRatio)}
                </div>
              </div>
              <div class={styles.overviewAlarmStatusList}>
                {STATUS_ITEMS.map((item) => (
                  <div class={styles.overviewAlarmStatusItem}>
                    <span>
                      <i style={{ background: item.color }} />
                      {item.label}
                    </span>
                    <strong>{alarmStatusNum(item.key)}</strong>
                  </div>
                ))}
              </div>
            </div>
            <Card class={styles.overviewLegacySmallCard} title="报警级别占比" bordered={false}>
              {state.alarmLevels.length ? (
                <ChartPanel option={pieOption(state.alarmLevels, "报警级别", "alarmNum")} height={280} />
              ) : (
                <Empty />
              )}
            </Card>
            <Card class={styles.overviewLegacyWideCard} title="巡逻路线异常分布情况" bordered={false}>
              {state.patrolLines.length ? <ChartPanel option={patrolLineOption.value} height={280} /> : <Empty />}
            </Card>
            <Card class={styles.overviewLegacySmallCard} title="区域报警占比" bordered={false}>
              {state.alarmAreas.length ? (
                <ChartPanel option={pieOption(state.alarmAreas, "区域报警", "totalNum")} height={280} />
              ) : (
                <Empty />
              )}
            </Card>
            <Card class={styles.overviewLegacyWideCard} title="报警趋势分析" bordered={false}>
              {state.alarmTrend.length ? <ChartPanel option={alarmTrendOption.value} height={280} /> : <Empty />}
            </Card>
          </div>
        </Spin>
      ),
    };
    return () => <PageLayout title="数据总览" v-slots={slots} showFooter={false} />;
  },
});

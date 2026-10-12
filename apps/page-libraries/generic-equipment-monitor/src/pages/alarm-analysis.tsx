import { AntRangePicker, Button, Card, Empty, PageLayout, Select, Space, Spin, dayjs, message, type Dayjs } from "@g2-platform/pc-ui";
import { computed, defineComponent, onMounted, reactive, ref, type PropType } from "vue";

import GemChartPanel from "../components/chart-panel";
import type { GemPageProps } from "./page-props";
import { numberValue, rowLabel, rowNumber, statisticsRecord, statisticsRows, type StatisticsRecord } from "./statistics-data";

import styles from "./alarm-analysis.module.css";

interface SelectOption {
  label: string;
  value: string;
}

const PERIOD_BUTTONS = [
  { key: "TODAY", label: "今日" },
  { key: "THIS_WEEK", label: "本周" },
  { key: "THIS_MONTH", label: "本月" },
  { key: "THIS_YEAR", label: "全年" },
] as const;

const LEVELS = [
  { code: "one_level", label: "一级报警", className: "levelOne" },
  { code: "two_level", label: "二级报警", className: "levelTwo" },
  { code: "three_level", label: "三级报警", className: "levelThree" },
  { code: "four_level", label: "四级报警", className: "levelFour" },
] as const;

function periodRange(type: string): [Dayjs, Dayjs] {
  const end = dayjs();
  if (type === "THIS_WEEK") return [end.startOf("week"), end];
  if (type === "THIS_MONTH") return [end.startOf("month"), end];
  if (type === "THIS_YEAR") return [end.startOf("year"), end];
  return [end.startOf("day"), end];
}

function rangePeriod(range: [Dayjs, Dayjs]): string {
  return `${range[0].format("YYYY-MM-DD HH:mm:ss")},${range[1].format("YYYY-MM-DD HH:mm:ss")}`;
}

function rowsFromField(record: StatisticsRecord, field: string): StatisticsRecord[] {
  const value = record[field];
  return Array.isArray(value) ? value.filter((item): item is StatisticsRecord => Boolean(item) && typeof item === "object") : [];
}

function verticalOption(rows: StatisticsRecord[], color: string) {
  return {
    tooltip: { trigger: "axis" },
    grid: { left: 48, right: 20, top: 24, bottom: 48 },
    xAxis: { type: "category", data: rows.map((row) => rowLabel(row, "name", "period")), axisLabel: { interval: 0, rotate: 18 } },
    yAxis: { type: "value", minInterval: 1 },
    series: [
      {
        type: "bar",
        barMaxWidth: 28,
        itemStyle: { color, borderRadius: [4, 4, 0, 0] },
        data: rows.map((row) => rowNumber(row, "totalNum", "alarmNum", "value")),
      },
    ],
  };
}

function horizontalOption(rows: StatisticsRecord[], valueField: string, labelField: string, color: string) {
  return {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 110, right: 24, top: 18, bottom: 28 },
    xAxis: { type: "value", minInterval: 1 },
    yAxis: { type: "category", data: rows.map((row) => rowLabel(row, labelField, "name")) },
    series: [
      {
        type: "bar",
        barMaxWidth: 18,
        itemStyle: { color, borderRadius: [0, 4, 4, 0] },
        data: rows.map((row) => rowNumber(row, valueField, "value")),
      },
    ],
  };
}

export default defineComponent({
  name: "GemAlarmAnalysis",
  props: {
    codes: { type: Object as PropType<GemPageProps["codes"]>, required: true },
    functionCodes: { type: [Object, Array] as PropType<GemPageProps["functionCodes"]>, required: true },
    onNavigatePage: { type: Function as PropType<GemPageProps["onNavigatePage"]>, required: true },
    getAlarmClient: { type: Function as PropType<GemPageProps["getAlarmClient"]>, required: true },
    getDeviceClient: { type: Function as PropType<GemPageProps["getDeviceClient"]>, required: true },
    applicationCode: { type: String, default: "" },
    title: { type: String, default: "报警分析" },
  },
  setup(props) {
    const loading = ref(false);
    const activePeriod = ref("TODAY");
    const dates = ref<[Dayjs, Dayjs]>(periodRange("TODAY"));
    const state = reactive({
      baseInfo: {} as StatisticsRecord,
      deviceOnline: 0,
      alarmLevels: [] as StatisticsRecord[],
      trend: [] as StatisticsRecord[],
      topTimeSlot: "",
      eventRows: [] as StatisticsRecord[],
      eventInfo: {} as StatisticsRecord,
      areaRows: [] as StatisticsRecord[],
      areaInfo: {} as StatisticsRecord,
      handlerInfo: {} as StatisticsRecord,
      handlerTop: [] as StatisticsRecord[],
      handlerLast: [] as StatisticsRecord[],
      efficiencyLevels: [] as StatisticsRecord[],
      efficiencyTop: [] as StatisticsRecord[],
      efficiencyLast: [] as StatisticsRecord[],
      levelOptions: [] as SelectOption[],
      topLevelId: "",
      lastLevelId: "",
    });

    const applicationCode = () => props.applicationCode.trim() || "DOORMANAGE";
    const query = () => ({
      applicationCode: applicationCode(),
      period: rangePeriod(dates.value),
      type: activePeriod.value,
    });

    const alarmTotal = computed(() => state.alarmLevels.reduce((total, row) => total + rowNumber(row, "alarmNum", "totalNum"), 0));
    const pieOption = computed(() => ({
      color: ["#ff4070", "#fba33f", "#5654f5", "#1890ff"],
      tooltip: { trigger: "item" },
      legend: { orient: "vertical", right: 8, top: "center", formatter: (name: string) => name },
      graphic: [
        {
          type: "text",
          left: "32%",
          top: "43%",
          style: { text: String(alarmTotal.value), fill: "#1d2129", fontSize: 22, fontWeight: 600, textAlign: "center" },
        },
        { type: "text", left: "31%", top: "55%", style: { text: "报警总数", fill: "#86909c", fontSize: 12, textAlign: "center" } },
      ],
      series: [
        {
          type: "pie",
          radius: ["48%", "70%"],
          center: ["36%", "52%"],
          label: { show: false },
          data: state.alarmLevels.map((row) => ({ name: rowLabel(row, "name"), value: rowNumber(row, "alarmNum", "totalNum") })),
        },
      ],
    }));
    const trendOption = computed(() => ({
      tooltip: { trigger: "axis" },
      grid: { left: 48, right: 20, top: 24, bottom: 42 },
      xAxis: { type: "category", boundaryGap: false, data: state.trend.map((row) => rowLabel(row, "period", "name")) },
      yAxis: { type: "value", minInterval: 1 },
      series: [
        {
          type: "line",
          smooth: true,
          symbol: "circle",
          color: "#40a3ff",
          areaStyle: { color: "rgba(64,163,255,.16)" },
          data: state.trend.map((row) => rowNumber(row, "alarmNum", "totalNum")),
        },
      ],
    }));

    const efficiencyName = (code: string, field: string): string => {
      const row = state.efficiencyLevels.find((item) => String(item.code ?? "").toLowerCase() === code);
      return row ? rowLabel(row, field) : "--";
    };

    const loadLevelOptions = async (): Promise<void> => {
      const client = await props.getAlarmClient!();
      const rows = statisticsRows(await client.getAlarmLevels({}), ["records", "list", "data"]);
      state.levelOptions = rows
        .map((row) => {
          const value = String(row.id ?? row.value ?? "");
          return value ? { value, label: String(row.name ?? row.label ?? value) } : null;
        })
        .filter((item): item is SelectOption => item !== null);
      state.topLevelId ||= state.levelOptions[0]?.value ?? "";
      state.lastLevelId ||= state.levelOptions[0]?.value ?? "";
    };

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const [alarmClient, deviceClient] = await Promise.all([props.getAlarmClient!(), props.getDeviceClient!()]);
        const baseQuery = query();
        const requests = await Promise.allSettled([
          alarmClient.getAlarmTotalStatistic(baseQuery),
          deviceClient.getStatusList(applicationCode()),
          alarmClient.getAlarmLevelStatistic(baseQuery),
          alarmClient.getAlarmTrendAnalysis(baseQuery),
          alarmClient.getAlarmEventAnalysis(baseQuery),
          alarmClient.getAlarmAreaAnalysis(baseQuery),
          alarmClient.getAlarmHandlerAnalysis(baseQuery),
          alarmClient.getAlarmHandlerEfficiencyAnalysis(baseQuery),
          state.topLevelId ? alarmClient.getUserHandlerTopAnalysis({ ...baseQuery, alarmLevelId: state.topLevelId }) : Promise.resolve([]),
          state.lastLevelId
            ? alarmClient.getUserHandlerLastTopAnalysis({ ...baseQuery, alarmLevelId: state.lastLevelId })
            : Promise.resolve([]),
        ]);
        const value = (index: number): unknown => (requests[index]?.status === "fulfilled" ? requests[index].value : undefined);

        state.baseInfo = statisticsRecord(value(0));
        const deviceRows = statisticsRows(value(1), ["statusListVos", "records", "list", "data"]);
        state.deviceOnline = rowNumber(
          deviceRows.find((row) => ["ONLINE", "NORMAL"].includes(String(row.name ?? row.code ?? "").toUpperCase())) ?? {},
          "num",
          "totalNum",
        );
        state.alarmLevels = statisticsRows(value(2), ["records", "list", "data"]);
        const trendInfo = statisticsRecord(value(3));
        state.trend = rowsFromField(trendInfo, "alarmTrendStatisticsVOS");
        state.topTimeSlot = String(trendInfo.topTimeSlot ?? "");
        state.eventInfo = statisticsRecord(value(4));
        state.eventRows = rowsFromField(state.eventInfo, "alarmCurrencyStatisticsVOS");
        state.areaInfo = statisticsRecord(value(5));
        state.areaRows = rowsFromField(state.areaInfo, "alarmCurrencyStatisticsVOS");
        state.handlerInfo = statisticsRecord(value(6));
        state.handlerTop = rowsFromField(state.handlerInfo, "topTenUserHandlerStatisticsVOS").toSorted(
          (left, right) => rowNumber(left, "alarmHandlerTotalNum") - rowNumber(right, "alarmHandlerTotalNum"),
        );
        state.handlerLast = rowsFromField(state.handlerInfo, "lastTopTenUserHandlerStatisticsVOS").toSorted(
          (left, right) => rowNumber(right, "alarmHandlerTotalNum") - rowNumber(left, "alarmHandlerTotalNum"),
        );
        state.efficiencyLevels = statisticsRows(value(7), ["records", "list", "data"]);
        state.efficiencyTop = statisticsRows(value(8), ["records", "list", "data"]).toReversed();
        state.efficiencyLast = statisticsRows(value(9), ["records", "list", "data"]).toSorted(
          (left, right) => rowNumber(left, "avgProcessMinutes") - rowNumber(right, "avgProcessMinutes"),
        );
        if (requests.some((item) => item.status === "rejected")) message.warning("部分报警分析数据加载失败");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "报警分析加载失败");
      } finally {
        loading.value = false;
      }
    };

    const selectPeriod = (type: string): void => {
      activePeriod.value = type;
      dates.value = periodRange(type);
      void load();
    };

    const changeDates = (value: unknown): void => {
      const first = Array.isArray(value) ? value[0] : undefined;
      const second = Array.isArray(value) ? value[1] : undefined;
      if (!first || !second) return;
      dates.value = [dayjs(first), dayjs(second)];
      activePeriod.value = "";
      void load();
    };

    onMounted(async () => {
      try {
        await loadLevelOptions();
      } catch {
        state.levelOptions = [];
      }
      await load();
    });

    const emptyChart = () => (
      <div class={styles.emptyChart}>
        <Empty description="暂无统计数据" />
      </div>
    );

    return () => (
      <PageLayout
        title={props.title}
        showFooter={false}
        v-slots={{
          "layout-header": () => (
            <Space size={8} wrap>
              {PERIOD_BUTTONS.map((item) => (
                <Button
                  key={item.key}
                  type={activePeriod.value === item.key ? "primary" : "default"}
                  onClick={() => selectPeriod(item.key)}
                >
                  {item.label}
                </Button>
              ))}
              <AntRangePicker
                value={dates.value}
                showTime
                allowClear={false}
                disabledDate={(current: Dayjs) => current.isAfter(dayjs().endOf("day"))}
                onUpdate:value={changeDates}
              />
            </Space>
          ),
          "layout-content": () => (
            <Spin spinning={loading.value}>
              <div class={styles.dashboard}>
                <Card class={[styles.card, styles.basicCard]} title="基本信息" bordered={false}>
                  <div class={styles.basicStats}>
                    <div class={styles.basicStat}>
                      <span class={[styles.statIcon, styles.deviceIcon]}>设备</span>
                      <div>
                        <span>监测设备正常数</span>
                        <strong>{state.deviceOnline}</strong>
                      </div>
                    </div>
                    <div class={styles.basicDivider} />
                    <div class={styles.basicStat}>
                      <span class={[styles.statIcon, styles.alarmIcon]}>报警</span>
                      <div>
                        <span>监测报警数</span>
                        <strong>{numberValue(state.baseInfo.alarmNum)}</strong>
                        <small>环比 {numberValue(state.baseInfo.ringRatio)}%</small>
                      </div>
                    </div>
                  </div>
                  {state.alarmLevels.length > 0 ? <GemChartPanel option={pieOption.value} height={230} /> : emptyChart()}
                </Card>

                <Card
                  class={[styles.card, styles.trendCard]}
                  title="报警分析"
                  extra={
                    state.topTimeSlot ? (
                      <span class={styles.description}>
                        <b>{state.topTimeSlot}</b> 时间段是事件高发期需要加强管理
                      </span>
                    ) : null
                  }
                  bordered={false}
                >
                  {state.trend.length > 0 ? <GemChartPanel option={trendOption.value} height={290} /> : emptyChart()}
                </Card>

                <Card class={[styles.card, styles.eventCard]} title="报警事件分析" bordered={false}>
                  {state.eventRows.length > 0 ? (
                    <>
                      <div class={styles.centerDescription}>
                        <b>{rowLabel(state.eventInfo, "alarmTopThreeEventNames")}</b> 报警事件高发，
                        <b>{rowLabel(state.eventInfo, "alarmTopEventName")}</b> 已发生
                        <em>{rowNumber(state.eventInfo, "alarmTopNum")}</em>次
                      </div>
                      <GemChartPanel option={verticalOption(state.eventRows, "#fba33f")} height={270} />
                    </>
                  ) : (
                    emptyChart()
                  )}
                </Card>

                <Card class={[styles.card, styles.areaCard]} title="报警区域分析" bordered={false}>
                  {state.areaRows.length > 0 ? (
                    <>
                      <div class={styles.centerDescription}>
                        <b>{rowLabel(state.areaInfo, "alarmTopThreeAreaNames")}</b> 报警事件高发，
                        <b>{rowLabel(state.areaInfo, "alarmTopAreaName")}</b> 已发生
                        <em>{rowNumber(state.areaInfo, "alarmTopNum")}</em>次
                      </div>
                      <GemChartPanel option={verticalOption(state.areaRows, "#3662ec")} height={270} />
                    </>
                  ) : (
                    emptyChart()
                  )}
                </Card>

                <Card class={[styles.card, styles.handlerCard]} title="报警处理分析" bordered={false}>
                  <div class={styles.handlerSummary}>
                    <div>
                      <span>已处理报警数</span>
                      <strong class={styles.teal}>{rowNumber(state.handlerInfo, "alarmHandlerTotalNum")}</strong>
                    </div>
                    <div>
                      <span>待处理报警数</span>
                      <strong class={styles.orange}>{rowNumber(state.handlerInfo, "alarmUnresolvedHandlerTotalNum")}</strong>
                    </div>
                    <p>
                      <b>{rowLabel(state.handlerInfo, "alarmHandlerTopThreeUserNames")}</b> 等人员处理的报警数量最多
                    </p>
                  </div>
                  <div class={styles.doubleChart}>
                    <div>
                      <h4>处理报警数排名 Top10</h4>
                      {state.handlerTop.length > 0 ? (
                        <GemChartPanel
                          option={horizontalOption(state.handlerTop, "alarmHandlerTotalNum", "name", "#1890ff")}
                          height={370}
                        />
                      ) : (
                        emptyChart()
                      )}
                    </div>
                    <div>
                      <h4>处理报警数倒数 Last10</h4>
                      {state.handlerLast.length > 0 ? (
                        <GemChartPanel
                          option={horizontalOption(state.handlerLast, "alarmHandlerTotalNum", "name", "#5654f5")}
                          height={370}
                        />
                      ) : (
                        emptyChart()
                      )}
                    </div>
                  </div>
                </Card>

                <Card class={[styles.card, styles.efficiencyCard]} title="报警处理效率分析" bordered={false}>
                  <div class={styles.doubleChart}>
                    <div class={styles.efficiencyPane}>
                      <div class={styles.levelGrid}>
                        {LEVELS.map((level) => (
                          <div key={level.code}>
                            <span class={styles[level.className]}>{level.label}</span>
                            <p>
                              <b>{efficiencyName(level.code, "highEfficiencyUserName")}</b> 处理该级报警效率最高
                            </p>
                          </div>
                        ))}
                      </div>
                      <div class={styles.chartTitle}>
                        <h4>处理报警效率排名 Top10</h4>
                        <Select
                          value={state.topLevelId}
                          options={state.levelOptions}
                          style={{ width: "150px" }}
                          onUpdate:value={(value: string) => {
                            state.topLevelId = value;
                            void load();
                          }}
                        />
                      </div>
                      {state.efficiencyTop.length > 0 ? (
                        <GemChartPanel
                          option={horizontalOption(state.efficiencyTop, "avgProcessMinutes", "alarmHandlerName", "#fba33f")}
                          height={330}
                        />
                      ) : (
                        emptyChart()
                      )}
                    </div>
                    <div class={styles.efficiencyPane}>
                      <div class={styles.levelGrid}>
                        {LEVELS.map((level) => (
                          <div key={level.code}>
                            <span class={styles[level.className]}>{level.label}</span>
                            <p>
                              <b>{efficiencyName(level.code, "lowEfficiencyUserName")}</b> 处理该级报警效率最低
                            </p>
                          </div>
                        ))}
                      </div>
                      <div class={styles.chartTitle}>
                        <h4>处理报警效率倒数 Last10</h4>
                        <Select
                          value={state.lastLevelId}
                          options={state.levelOptions}
                          style={{ width: "150px" }}
                          onUpdate:value={(value: string) => {
                            state.lastLevelId = value;
                            void load();
                          }}
                        />
                      </div>
                      {state.efficiencyLast.length > 0 ? (
                        <GemChartPanel
                          option={horizontalOption(state.efficiencyLast, "avgProcessMinutes", "alarmHandlerName", "#fba33f")}
                          height={330}
                        />
                      ) : (
                        emptyChart()
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </Spin>
          ),
        }}
      />
    );
  },
});

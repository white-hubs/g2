import { AntRangePicker, Button, Card, type Dayjs, Empty, PageLayout, Spin, Table, dayjs, message } from "@g2-platform/pc-ui";
import { type PropType, computed, defineComponent, onMounted, reactive, ref } from "vue";

import { hasCapability } from "../capability";
import GemChartPanel from "../components/chart-panel";
import StatisticIcon from "../components/statistic-icon";
import { GEM_PAGE_KEYS } from "../page-keys";
import type { GemPageProps } from "./page-props";
import { numberValue, rowLabel, rowNumber, statisticsRecord, statisticsRows, type StatisticsRecord } from "./statistics-data";

import styles from "./overview.module.css";

const PERIODS = [
  { value: "TODAY", label: "今日" },
  { value: "THIS_WEEK", label: "本周" },
  { value: "THIS_MONTH", label: "本月" },
  { value: "THIS_YEAR", label: "全年" },
] as const;

const STATUS_ITEMS = [
  { key: "ALARM_UN_CONFIRMED", label: "待接收", color: "#1890ff" },
  { key: "ALARM_SUSPEND", label: "已挂起", color: "#fba33f" },
  { key: "ALARM_PROGRESS_CONFIRMED", label: "处理中", color: "#3662ec" },
  { key: "ALARM_HANDLER", label: "已处理", color: "#00ba8b" },
];

const LEVEL_COLORS: Record<string, string> = {
  one_level: "#f53f3f",
  two_level: "#fba33f",
  three_level: "#3662ec",
  four_level: "#00ba8b",
  一级: "#f53f3f",
  二级: "#fba33f",
  三级: "#3662ec",
  四级: "#00ba8b",
};

function periodOf(range: [Dayjs, Dayjs]): string {
  return `${range[0].format("YYYY-MM-DD HH:mm:ss")},${range[1].format("YYYY-MM-DD HH:mm:ss")}`;
}

function numberText(value: unknown): string {
  return numberValue(value).toLocaleString("en-US");
}

function percentText(value: unknown): string {
  return `${numberValue(value).toFixed(2)}%`;
}

export default defineComponent({
  name: "GemOverView",
  props: {
    codes: { type: Object as PropType<GemPageProps["codes"]>, required: true },
    functionCodes: { type: [Object, Array] as PropType<GemPageProps["functionCodes"]>, required: true },
    onNavigatePage: { type: Function as PropType<GemPageProps["onNavigatePage"]>, required: true },
    getAlarmClient: { type: Function as PropType<GemPageProps["getAlarmClient"]>, required: true },
    getDeviceClient: { type: Function as PropType<GemPageProps["getDeviceClient"]>, default: undefined },
    applicationCode: { type: String, default: "" },
    title: { type: String, default: "总览中心" },
  },
  setup(props) {
    const applicationCode = () => props.applicationCode.trim() || "DOORMANAGE";
    const periodType = ref<(typeof PERIODS)[number]["value"] | "">("TODAY");
    const range = ref<[Dayjs, Dayjs]>([dayjs().startOf("day"), dayjs()]);
    const loading = ref(false);
    const state = reactive({
      deviceTotal: 0,
      deviceOnline: 0,
      deviceOffline: 0,
      alarmTotal: 0,
      alarmRatio: 0,
      deviceStatus: [] as StatisticsRecord[],
      alarmStatus: [] as StatisticsRecord[],
      levels: [] as StatisticsRecord[],
      events: [] as StatisticsRecord[],
      areas: [] as StatisticsRecord[],
      devices: [] as StatisticsRecord[],
    });

    const query = (): Record<string, unknown> => ({
      applicationCode: applicationCode(),
      period: periodOf(range.value),
      type: periodType.value || undefined,
    });

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const getAlarmClient = props.getAlarmClient;
        if (!getAlarmClient) throw new Error("alarm client is unavailable");
        const alarm = await getAlarmClient();
        const device = props.getDeviceClient ? await props.getDeviceClient() : undefined;
        const request = query();
        const [statusRaw, totalRaw, alarmStatusRaw, levelRaw, eventRaw, areaRaw, deviceRaw] = await Promise.all([
          device?.getStatusList(applicationCode()) ?? Promise.resolve(null),
          alarm.getAlarmTotalStatistic(request),
          alarm.getAlarmStatusGroupStatistics(request),
          alarm.getAlarmLevelStatistic(request),
          alarm.getAlarmEventStatistic(request),
          alarm.getAlarmAreaStatistic(request),
          alarm.getAlarmDeviceTopTen(request),
        ]);

        const statusRecord = statisticsRecord(statusRaw);
        const statusRows = statisticsRows(statusRaw, ["statusListVos", "records", "list"]);
        const statusTotal =
          statusRecord.total ?? statusRecord.totalNum ?? statusRows.reduce((sum, row) => sum + rowNumber(row, "num", "totalNum"), 0);
        state.deviceStatus = statusRows;
        state.deviceTotal = numberValue(statusTotal);
        state.deviceOnline = rowNumber(statusRows.find((row) => rowLabel(row, "name", "code") === "ONLINE") ?? {}, "num", "totalNum");
        state.deviceOffline = rowNumber(statusRows.find((row) => rowLabel(row, "name", "code") === "OFFLINE") ?? {}, "num", "totalNum");

        const total = statisticsRecord(totalRaw);
        state.alarmTotal = numberValue(total.alarmNum ?? total.totalNum);
        state.alarmRatio = numberValue(total.ringRatio);
        state.alarmStatus = statisticsRows(alarmStatusRaw, ["records", "list", "alarmStatusGroupStatisticsVOS"]);
        state.levels = statisticsRows(levelRaw, ["records", "list", "alarmCurrencyStatisticsVOS"]);
        state.events = statisticsRows(eventRaw, ["records", "list", "alarmCurrencyStatisticsVOS"]);
        state.areas = statisticsRows(areaRaw, ["records", "list", "alarmCurrencyStatisticsVOS"]);
        state.devices = statisticsRows(deviceRaw, ["records", "list", "alarmCurrencyStatisticsVOS"]);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "动环中心数据加载失败");
      } finally {
        loading.value = false;
      }
    };

    const alarmStatusNum = (key: string): number =>
      rowNumber(state.alarmStatus.find((row) => rowLabel(row, "alarmStatus", "code", "name") === key) ?? {}, "alarmNum", "num", "totalNum");

    const pieOption = (rows: StatisticsRecord[], name: string) => ({
      tooltip: { trigger: "item" },
      legend: { bottom: 0, type: "scroll" },
      color: rows.map(
        (row, index) => LEVEL_COLORS[rowLabel(row, "code", "name")] ?? ["#f53f3f", "#fba33f", "#3662ec", "#00ba8b"][index % 4],
      ),
      series: [
        {
          name,
          type: "pie",
          radius: ["48%", "70%"],
          center: ["50%", "43%"],
          label: { formatter: "{b}  {c}" },
          data: rows.map((row) => ({
            name: rowLabel(row, "name", "areaName", "code"),
            value: rowNumber(row, "alarmNum", "totalNum", "value"),
          })),
        },
      ],
    });

    const eventOption = computed(() => ({
      tooltip: { trigger: "axis" },
      grid: { left: 42, right: 22, top: 28, bottom: 38 },
      xAxis: { type: "category", data: state.events.map((row) => rowLabel(row, "name", "alarmEventName")) },
      yAxis: { type: "value", minInterval: 1 },
      series: [
        { type: "bar", barWidth: 20, color: "#3662ec", data: state.events.map((row) => rowNumber(row, "totalNum", "alarmNum", "value")) },
      ],
    }));

    const selectPeriod = (value: (typeof PERIODS)[number]["value"]): void => {
      const now = dayjs();
      const start =
        value === "TODAY"
          ? now.startOf("day")
          : value === "THIS_WEEK"
            ? now.startOf("week")
            : value === "THIS_MONTH"
              ? now.startOf("month")
              : now.startOf("year");
      periodType.value = value;
      range.value = [start, now];
      void load();
    };

    const updateRange = (value: unknown): void => {
      const values = Array.isArray(value) ? value : [];
      if (values.length !== 2 || !values[0] || !values[1]) return;
      periodType.value = "";
      range.value = values as [Dayjs, Dayjs];
      void load();
    };

    const ratio = () => (
      <span class={styles.ratio}>
        <span class={styles.ratioLabel}>环比</span>
        {state.alarmRatio > 0 ? <span class={styles.ratioUp}>↑</span> : null}
        {state.alarmRatio < 0 ? <span class={styles.ratioDown}>↓</span> : null}
        <span>{percentText(state.alarmRatio)}</span>
      </span>
    );

    const rankCell = ({ index }: { index: number }) => (
      <span class={[styles.rankCell, index === 0 ? styles.rank1 : "", index === 1 ? styles.rank2 : "", index === 2 ? styles.rank3 : ""]}>
        {index + 1}
      </span>
    );
    const areaColumns = [
      { title: "排名", dataIndex: "rank", width: 70, customRender: rankCell },
      {
        title: "区域名称",
        dataIndex: "name",
        ellipsis: true,
        customRender: ({ record }: { record: StatisticsRecord }) => rowLabel(record, "name", "areaName"),
      },
      {
        title: "数量",
        dataIndex: "totalNum",
        width: 90,
        customRender: ({ record }: { record: StatisticsRecord }) => rowNumber(record, "totalNum", "alarmNum", "value"),
      },
      {
        title: "占比",
        dataIndex: "ratio",
        width: 90,
        customRender: ({ record }: { record: StatisticsRecord }) => String(record.ratio ?? "0.00%"),
      },
    ];
    const deviceColumns = [
      { title: "排名", dataIndex: "rank", width: 70, customRender: rankCell },
      {
        title: "设备名称",
        dataIndex: "name",
        ellipsis: true,
        customRender: ({ record }: { record: StatisticsRecord }) => rowLabel(record, "name", "deviceName"),
      },
      {
        title: "数量",
        dataIndex: "totalNum",
        width: 90,
        customRender: ({ record }: { record: StatisticsRecord }) => rowNumber(record, "totalNum", "alarmNum", "value"),
      },
      {
        title: "占比",
        dataIndex: "ratio",
        width: 90,
        customRender: ({ record }: { record: StatisticsRecord }) => String(record.ratio ?? "0.00%"),
      },
    ];

    onMounted(() => void load());

    return () => {
      const areaRows = state.areas.toSorted(
        (left, right) => rowNumber(right, "totalNum", "alarmNum") - rowNumber(left, "totalNum", "alarmNum"),
      );
      return (
        <PageLayout
          title={props.title}
          showFooter={false}
          v-slots={{
            "layout-header": () => (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {PERIODS.map((item) => (
                  <Button
                    key={item.value}
                    type={periodType.value === item.value ? "primary" : "default"}
                    onClick={() => selectPeriod(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
                <AntRangePicker value={range.value} onUpdate:value={updateRange} />
              </div>
            ),
            "layout-content": () => (
              <Spin spinning={loading.value}>
                <div class={styles.page}>
                  <div class={styles.grid}>
                    <div class={[styles.statCard, styles.patrolCard].join(" ")}>
                      <div class={[styles.icon, styles.orange].join(" ")}>
                        <StatisticIcon name="patrol" />
                      </div>
                      <div class={styles.body}>
                        <span>监测设备数</span>
                        <strong>{numberText(state.deviceTotal)}</strong>
                      </div>
                      <div class={styles.inlineStat}>
                        <span class={styles.deviceStatusOnline}>
                          <span class={styles.statusIcon} />
                          在线
                        </span>
                        <strong>{numberText(state.deviceOnline)}</strong>
                      </div>
                      <div class={styles.inlineStat}>
                        <span class={styles.deviceStatusOffline}>
                          <span class={styles.statusIcon} />
                          离线
                        </span>
                        <strong>{numberText(state.deviceOffline)}</strong>
                      </div>
                    </div>
                    <div class={[styles.statCard, styles.alarmCard].join(" ")}>
                      <div class={styles.alarmLeft}>
                        <div class={[styles.icon, styles.red].join(" ")}>
                          <StatisticIcon name="alarm" />
                        </div>
                        <div class={styles.body}>
                          <span>报警总数</span>
                          <strong>{numberText(state.alarmTotal)}</strong>
                          {ratio()}
                        </div>
                      </div>
                      <div class={styles.statusList}>
                        {STATUS_ITEMS.map((item) => (
                          <div class={styles.statusItem} key={item.key}>
                            <span>
                              <i class={styles.statusDot} style={{ color: item.color }} />
                              {item.label}
                            </span>
                            <strong>{numberText(alarmStatusNum(item.key))}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Card class={styles.smallCard} title="报警级别分布图" bordered={false}>
                      {state.levels.length ? <GemChartPanel option={pieOption(state.levels, "报警级别")} height={280} /> : <Empty />}
                    </Card>
                    <Card class={styles.wideCard} title="报警数量分布图" bordered={false}>
                      {state.events.length ? <GemChartPanel option={eventOption.value} height={280} /> : <Empty />}
                    </Card>
                    <Card class={styles.areaCard} title="报警区域TOP10" bordered={false}>
                      <Table rowKey="id" columns={areaColumns} dataSource={areaRows} pagination={false} scroll={{ y: 280 }} />
                    </Card>
                    <Card class={styles.deviceCard} title="报警设备TOP10" bordered={false}>
                      {state.devices.length ? (
                        <Table rowKey="id" columns={deviceColumns} dataSource={state.devices} pagination={false} scroll={{ y: 280 }} />
                      ) : (
                        <Empty />
                      )}
                    </Card>
                  </div>
                  <div class={styles.links}>
                    {hasCapability(props.codes, props.functionCodes, "page", GEM_PAGE_KEYS.equipmentMonitorList) ? (
                      <Button type="link" onClick={() => props.onNavigatePage({ page: GEM_PAGE_KEYS.equipmentMonitorList })}>
                        设备监测
                      </Button>
                    ) : null}
                    {hasCapability(props.codes, props.functionCodes, "page", GEM_PAGE_KEYS.alarmRecord) ? (
                      <Button type="link" onClick={() => props.onNavigatePage({ page: GEM_PAGE_KEYS.alarmRecord })}>
                        报警记录
                      </Button>
                    ) : null}
                    {hasCapability(props.codes, props.functionCodes, "page", GEM_PAGE_KEYS.alarmStatistic) ? (
                      <Button type="link" onClick={() => props.onNavigatePage({ page: GEM_PAGE_KEYS.alarmStatistic })}>
                        报警统计
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Spin>
            ),
          }}
        />
      );
    };
  },
});

// @ts-nocheck — statistics columns intentionally accept legacy and current backend field names.
import { computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { getSecurityAlarmClient, getSecurityDeviceClient } from "../domain-context";
import ChartPanel from "./chart-panel";
import { normalizePage, normalizeRecord, recordId, text, type SecurityRecord } from "./data";
import { defineAsyncSecurityPcUiComponent, loadSecurityPcUi } from "./pc-ui-runtime";
import TimeRangeSelector from "./time-range-selector";

import styles from "./security-monitor.module.css";

const APPLICATION_CODE = "SECURITY_MONITORING";
const n = (value: unknown): number => Number(value ?? 0) || 0;
const WEEK_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const TREND_TYPES: Record<string, string> = {
  TODAY: "TODAY",
  THIS_WEEK: "THIS_WEEK",
  THIS_MONTH: "MONTH",
  THIS_YEAR: "YEAR",
};
const ALARM_LEVEL_ORDER: Record<string, number> = {
  one_level: 1,
  two_level: 2,
  three_level: 3,
  four_level: 4,
  一级: 1,
  二级: 2,
  三级: 3,
  四级: 4,
};
const ALARM_LEVEL_COLORS: Record<string, string> = {
  one_level: "#F53F3F",
  two_level: "#FBA33F",
  three_level: "#3662EC",
  four_level: "#00BA8B",
};
const Button = defineAsyncSecurityPcUiComponent("Button");
const Card = defineAsyncSecurityPcUiComponent("Card");
const Empty = defineAsyncSecurityPcUiComponent("Empty");
const Input = defineAsyncSecurityPcUiComponent("Input");
const Page = defineAsyncSecurityPcUiComponent("Page");
const PageLayout = defineAsyncSecurityPcUiComponent("PageLayout");
const RangePicker = defineAsyncSecurityPcUiComponent("RangePicker");
const Spin = defineAsyncSecurityPcUiComponent("Spin");
const Table = defineAsyncSecurityPcUiComponent("Table");
const notifySecurityUiError = async (error: unknown, fallback: string): Promise<void> => {
  const { message } = (await loadSecurityPcUi()) as { message: { error: (text: string) => void } };
  message.error(error instanceof Error ? error.message : fallback);
};
const toPeriod = (value: unknown[]): string =>
  Array.isArray(value) && value.length === 2 ? value.map((item: any) => item?.format?.("YYYY-MM-DD") ?? String(item)).join(",") : "";
const download = (raw: unknown, name: string): void => {
  const blob =
    raw instanceof Blob ? raw : new Blob([raw as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};
const sortAlarmLevels = (levels: SecurityRecord[]): SecurityRecord[] =>
  levels.toSorted(
    (left, right) =>
      (ALARM_LEVEL_ORDER[String(left.code ?? left.name)] ?? 99) - (ALARM_LEVEL_ORDER[String(right.code ?? right.name)] ?? 99),
  );
const formatWeekPeriod = (period: unknown, datePeriod: string): string => {
  const fullDate = new Date(String(period));
  if (!Number.isNaN(fullDate.getTime()) && String(period).includes("-")) {
    return WEEK_LABELS[(fullDate.getDay() + 6) % 7] ?? String(period);
  }

  const dayOfMonth = Number(period);
  const [begin, end] = datePeriod.split(",");
  const current = new Date(begin);
  const endDate = new Date(end);
  if (Number.isNaN(current.getTime()) || Number.isNaN(endDate.getTime())) return String(period ?? "");
  current.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  while (current <= endDate) {
    if (current.getDate() === dayOfMonth) return WEEK_LABELS[(current.getDay() + 6) % 7] ?? String(period);
    current.setDate(current.getDate() + 1);
  }
  return String(period ?? "");
};
const formatTrendPeriod = (period: unknown, type: string, datePeriod: string): string => {
  if (type === "TODAY") return `${period}时`;
  if (type === "THIS_WEEK") return formatWeekPeriod(period, datePeriod);
  if (type === "THIS_MONTH") return `${period}日`;
  if (type === "THIS_YEAR") return `${period}月`;
  return String(period ?? "");
};

function createStatisticPage(mode: "event" | "user") {
  return defineComponent({
    name: mode === "event" ? "SecurityAlarmStatisticsPage" : "SecurityAlarmHandlerStatisticsPage",
    setup() {
      const router = useRouter();
      const rows = ref<SecurityRecord[]>([]);
      const loading = ref(false);
      const exporting = ref(false);
      const dates = ref<unknown[]>([]);
      const query = reactive({ pageNumber: 1, pageSize: 10, total: 0, keyword: "" });
      const request = (): Record<string, unknown> => ({
        applicationCode: APPLICATION_CODE,
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
        keyword: query.keyword,
        period: toPeriod(dates.value),
      });
      const load = async (): Promise<void> => {
        loading.value = true;
        try {
          const api = await getSecurityAlarmClient();
          const page = normalizePage(
            mode === "event" ? await api.getAlarmStatisticByEvent(request()) : await api.getAlarmStatisticByUser(request()),
          );
          rows.value = page.records;
          query.total = page.total;
        } catch (error) {
          rows.value = [];
          query.total = 0;
          await notifySecurityUiError(error, "统计数据加载失败");
        } finally {
          loading.value = false;
        }
      };
      const drill = (row: SecurityRecord, alarmStatus = "", timeout = ""): void => {
        void router.push({
          path: "/d/security-monitor/alarm/record",
          query: {
            period: toPeriod(dates.value),
            alarmEvent: row.alarmEvent as string,
            alarmEventName: row.alarmEventName as string,
            userId: row.userId as string,
            userName: row.userName as string,
            departmentId: row.departmentId as string,
            alarmStatus,
            alarmHandlerTimeoutStatus: timeout,
          },
        });
      };
      const linkColumn = (title: string, field: string, status = "", timeout = "") => ({
        title,
        dataIndex: field,
        width: 130,
        customRender: ({ record }: { record: SecurityRecord }) => (
          <Button type="link" onClick={() => drill(record, status, timeout)}>
            {n(record[field])}
          </Button>
        ),
      });
      const eventColumns = [
        {
          title: "报警事件",
          dataIndex: "alarmEventName",
          minWidth: 180,
          customRender: ({ record }: any) => text(record, "alarmEventName"),
        },
        { title: "报警总数", dataIndex: "totalNum", width: 110 },
        linkColumn("待接收报警数", "unConfirmedNum", "ALARM_UN_CONFIRMED"),
        linkColumn("处理中报警数", "progressConfirmedNum", "ALARM_PROGRESS_CONFIRMED"),
        linkColumn("已处理报警数", "handlerNum", "ALARM_HANDLER"),
        linkColumn("已挂起报警数", "suspendNum", "ALARM_SUSPEND"),
        linkColumn("超时报警数", "timeoutNum", "", "TIMED_OUT"),
      ];
      const userColumns = [
        { title: "人员", dataIndex: "userName", fixed: "left", width: 120 },
        { title: "所属部门", dataIndex: "departmentName", width: 150 },
        { title: "部门报警总数", dataIndex: "departmentTotalNum", width: 130 },
        { title: "个人报警总数", dataIndex: "totalNum", width: 130 },
        linkColumn("待接收", "unconfirmedNum", "ALARM_UN_CONFIRMED"),
        linkColumn("处理中", "progressConfirmedNum", "ALARM_PROGRESS_CONFIRMED"),
        linkColumn("已处理", "handlerNum", "ALARM_HANDLER"),
        linkColumn("已挂起", "suspendNum", "ALARM_SUSPEND"),
        linkColumn("超时", "timeoutNum", "", "TIMED_OUT"),
        { title: "处理占比", dataIndex: "ratio", width: 110 },
        { title: "处理率", dataIndex: "handlerRate", width: 100 },
        { title: "接收率", dataIndex: "confirmedRate", width: 100 },
        { title: "超时率", dataIndex: "timeoutRate", width: 100 },
        { title: "平均处理时长", dataIndex: "averageProcessing", width: 140 },
      ];
      const doExport = async (): Promise<void> => {
        exporting.value = true;
        try {
          const api = await getSecurityAlarmClient();
          const raw = mode === "event" ? await api.exportAlarmStatisticByEvent(request()) : await api.exportAlarmStatisticByUser(request());
          download(raw, mode === "event" ? "报警统计.xlsx" : "报警处理统计.xlsx");
        } catch (error) {
          await notifySecurityUiError(error, "导出失败");
        } finally {
          exporting.value = false;
        }
      };
      onMounted(load);
      const slots = {
        "layout-header": () => (
          <Button type="primary" loading={exporting.value} onClick={() => void doExport()}>
            导出
          </Button>
        ),
        "layout-content": () => (
          <>
            <div class={styles.filterBar}>
              <span>报警时间：</span>
              <RangePicker value={dates.value} onUpdate:value={(value: unknown[]) => (dates.value = value ?? [])} />
              <Input
                class={styles.search}
                value={query.keyword}
                allowClear
                placeholder={mode === "event" ? "请输入报警事件" : "请输入人员名称"}
                onUpdate:value={(value: string) => (query.keyword = value)}
                onPressEnter={() => void load()}
              />
              <Button
                type="primary"
                onClick={() => {
                  query.pageNumber = 1;
                  void load();
                }}
              >
                查询
              </Button>
              <Button
                onClick={() => {
                  dates.value = [];
                  query.keyword = "";
                  query.pageNumber = 1;
                  void load();
                }}
              >
                重置
              </Button>
            </div>
            <Table
              rowKey={(row: SecurityRecord) => recordId(row) || text(row, "alarmEvent", "userId")}
              columns={mode === "event" ? eventColumns : userColumns}
              dataSource={rows.value}
              loading={loading.value}
              pagination={false}
              scroll={{ x: mode === "user" ? 1800 : 1000 }}
            />
          </>
        ),
        "footer-page": () => (
          <Page
            current={query.pageNumber}
            pageSize={query.pageSize}
            total={query.total}
            onPageChange={(page: number, size: number) => {
              query.pageNumber = page;
              query.pageSize = size;
              void load();
            }}
          />
        ),
      };
      return () => <PageLayout title={mode === "event" ? "报警统计" : "报警处理统计"} v-slots={slots} />;
    },
  });
}

export const AlarmStatisticsPage = createStatisticPage("event");
export const AlarmHandlerStatisticsPage = createStatisticPage("user");

export const SafetyAnalysisPage = defineComponent({
  name: "SecuritySafetyAnalysisPage",
  setup() {
    const loading = ref(false);
    const periodType = ref("TODAY");
    const period = ref("");
    const state = reactive({
      online: 0,
      total: 0,
      ratio: 0,
      levels: [] as SecurityRecord[],
      trend: [] as SecurityRecord[],
      events: [] as SecurityRecord[],
      areas: [] as SecurityRecord[],
      eventTopThreeNames: "",
      eventTopName: "",
      eventTopNum: 0,
      areaTopThreeNames: "",
      areaTopName: "",
      areaTopNum: 0,
    });
    const rows = (raw: unknown): SecurityRecord[] => {
      const page = normalizePage(raw).records;
      const record = normalizeRecord(raw);
      return page.length ? page : Array.isArray(record.alarmCurrencyStatisticsVOS) ? record.alarmCurrencyStatisticsVOS : [];
    };
    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const [alarm, device] = await Promise.all([getSecurityAlarmClient(), getSecurityDeviceClient()]);
        const query = { applicationCode: APPLICATION_CODE, period: period.value, type: periodType.value };
        const [totalRaw, levelRaw, trendRaw, eventRaw, areaRaw, statusRaw] = await Promise.all([
          alarm.getAlarmTotalStatistic(query),
          alarm.getAlarmLevelStatistic(query),
          alarm.getAlarmTrendAnalysis({ period: period.value, type: TREND_TYPES[periodType.value] ?? periodType.value }),
          alarm.getAlarmEventAnalysis(query),
          alarm.getAlarmAreaAnalysis(query),
          device.getStatusList(APPLICATION_CODE),
        ]);
        const total = normalizeRecord(totalRaw),
          event = normalizeRecord(eventRaw),
          area = normalizeRecord(areaRaw),
          status = normalizeRecord(statusRaw);
        const statuses = normalizePage(statusRaw).records.length
          ? normalizePage(statusRaw).records
          : ((status.statusListVos as SecurityRecord[]) ?? []);
        state.online = n(statuses.find((row) => String(row.name ?? row.code) === "ONLINE")?.num);
        state.total = n(total.alarmNum ?? total.totalNum);
        state.ratio = n(total.ringRatio);
        state.levels = sortAlarmLevels(rows(levelRaw));
        state.trend = rows(trendRaw);
        state.events = rows(eventRaw);
        state.areas = rows(areaRaw);
        state.eventTopThreeNames = String(event.alarmTopThreeEventNames ?? "");
        state.eventTopName = String(event.alarmTopEventName ?? "");
        state.eventTopNum = n(event.alarmTopNum);
        state.areaTopThreeNames = String(area.alarmTopThreeAreaNames ?? "");
        state.areaTopName = String(area.alarmTopAreaName ?? "");
        state.areaTopNum = n(area.alarmTopNum);
      } catch (error) {
        await notifySecurityUiError(error, "安全分析加载失败");
      } finally {
        loading.value = false;
      }
    };
    const line = (data: SecurityRecord[], color: string, labels?: string[], gradient = false) => ({
      tooltip: { trigger: "axis" },
      grid: { left: 42, right: 20, top: 20, bottom: 34 },
      xAxis: { type: "category", boundaryGap: false, data: labels ?? data.map((r) => String(r.period ?? r.name ?? "")) },
      yAxis: { type: "value", minInterval: 1 },
      series: [
        {
          type: "line",
          smooth: true,
          symbol: "circle",
          color,
          areaStyle: gradient
            ? {
                color: {
                  type: "linear",
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: "rgba(16, 128, 255, 0)" },
                    { offset: 1, color: "rgba(17, 126, 255, 0.16)" },
                  ],
                },
              }
            : { opacity: 0.1 },
          data: data.map((r) => n(r.alarmNum ?? r.totalNum)),
        },
      ],
    });
    const pie = computed(() => ({
      tooltip: { trigger: "item" },
      legend: { bottom: 0, type: "scroll" },
      color: state.levels.map((row, index) =>
        String(row.color ?? ALARM_LEVEL_COLORS[String(row.code ?? "")] ?? ["#F53F3F", "#FBA33F", "#3662EC", "#00BA8B"][index]),
      ),
      series: [
        {
          type: "pie",
          radius: ["48%", "70%"],
          center: ["50%", "45%"],
          label: { formatter: "{b}  {c}" },
          data: state.levels.map((r) => ({ name: String(r.name ?? r.code ?? "--"), value: n(r.alarmNum) })),
        },
      ],
    }));
    const ratio = () => (
      <em>
        环比 {state.ratio > 0 ? <span class={styles.analysisRatioUp}>↑</span> : null}
        {state.ratio < 0 ? <span class={styles.analysisRatioDown}>↓</span> : null}
        {state.ratio}%
      </em>
    );
    const description = (topThreeNames: string, topName: string, topNum: number) =>
      topNum ? (
        <div class={styles.chartDescription}>
          <span class={styles.analysisDescriptionBlue}>{topThreeNames}</span> 报警事件高发，
          <span class={styles.analysisDescriptionBlue}>{topName}</span> 报警事件已发生
          <span class={styles.analysisDescriptionValue}>{topNum}</span> 次
        </div>
      ) : null;
    const slots = {
      "layout-header": () => (
        <TimeRangeSelector
          trendMode
          alwaysShowRange
          onChange={({ type, period: value }: { type: string; period: string }) => {
            periodType.value = type;
            period.value = value;
            void load();
          }}
        />
      ),
      "layout-content": () => (
        <Spin spinning={loading.value}>
          <div class={styles.analysisGrid}>
            <Card class={styles.analysisCard} title="基本信息" bordered={false}>
              <div class={styles.metricRow}>
                <div class={styles.metric}>
                  <span class={styles.metricIconTeal}>监</span>
                  <div>
                    <small>监测设备正常数</small>
                    <strong>{state.online}</strong>
                  </div>
                </div>
                <div class={styles.metricDivider} />
                <div class={styles.metric}>
                  <span class={styles.metricIconRed}>警</span>
                  <div>
                    <small>监测报警数</small>
                    <strong>{state.total}</strong>
                    {ratio()}
                  </div>
                </div>
              </div>
              {state.levels.length ? <ChartPanel option={pie.value} height={220} /> : <Empty />}
            </Card>
            <Card class={styles.analysisCard} title="报警分析" bordered={false}>
              <ChartPanel
                option={line(
                  state.trend,
                  "#40A3FF",
                  state.trend.map((row) => formatTrendPeriod(row.period, periodType.value, period.value)),
                  true,
                )}
                height={300}
              />
            </Card>
            <Card class={styles.analysisCard} title="报警事件分析" bordered={false}>
              {state.events.length ? (
                <>
                  {description(state.eventTopThreeNames, state.eventTopName, state.eventTopNum)}
                  <ChartPanel
                    option={line(
                      state.events,
                      "#FBA33F",
                      state.events.map((row) => String(row.name ?? "")),
                    )}
                    height={280}
                  />
                </>
              ) : (
                <Empty />
              )}
            </Card>
            <Card class={styles.analysisCard} title="报警区域分析" bordered={false}>
              {state.areas.length ? (
                <>
                  {description(state.areaTopThreeNames, state.areaTopName, state.areaTopNum)}
                  <ChartPanel
                    option={line(
                      state.areas,
                      "#3662EC",
                      state.areas.map((row) => String(row.name ?? "")),
                    )}
                    height={280}
                  />
                </>
              ) : (
                <Empty />
              )}
            </Card>
          </div>
        </Spin>
      ),
    };
    return () => <PageLayout title="安全分析" v-slots={slots} showFooter={false} />;
  },
});

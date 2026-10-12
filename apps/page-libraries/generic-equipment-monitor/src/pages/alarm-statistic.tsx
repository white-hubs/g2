import {
  AntRangePicker,
  Button,
  Card,
  Empty,
  Input,
  Page,
  PageLayout,
  Select,
  Spin,
  Table,
  dayjs,
  message,
  type Dayjs,
} from "@g2-platform/pc-ui";
import { computed, defineComponent, onMounted, reactive, ref, type PropType } from "vue";

import GemChartPanel from "../components/chart-panel";
import { GEM_PAGE_KEYS } from "../page-keys";
import type { GemPageProps } from "./page-props";
import {
  numberValue,
  rowLabel,
  rowNumber,
  statisticsPage,
  statisticsRecord,
  statisticsRows,
  type StatisticsRecord,
} from "./statistics-data";

import styles from "./alarm-statistic.module.css";

type StatisticMode = "trend" | "event" | "area" | "handler" | "status" | "user" | "device";

interface SelectOption {
  label: string;
  value: string;
}

function rangePeriod(range: [Dayjs, Dayjs] | undefined): string {
  return range ? `${range[0].format("YYYY-MM-DD HH:mm:ss")},${range[1].format("YYYY-MM-DD HH:mm:ss")}` : "";
}

function valueText(value: unknown): string {
  return numberValue(value).toLocaleString("en-US");
}

function selectOptions(raw: unknown): SelectOption[] {
  const rows = statisticsRows(raw, ["records", "list", "children", "data"]);
  return rows
    .map((row) => {
      const value = String(row.id ?? row.value ?? row.code ?? "");
      const label = String(row.name ?? row.label ?? row.title ?? value);
      return value ? { label, value } : null;
    })
    .filter((item): item is SelectOption => item !== null);
}

function departmentOptions(nodes: unknown[]): SelectOption[] {
  const result: SelectOption[] = [];
  const visit = (items: unknown[]): void => {
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const value = String(row.id ?? row.value ?? "");
      if (value) result.push({ value, label: String(row.name ?? row.label ?? value) });
      if (Array.isArray(row.children)) visit(row.children);
    }
  };
  visit(nodes);
  return result;
}

function download(raw: unknown, name: string): void {
  const blob =
    raw instanceof Blob ? raw : new Blob([raw as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export default defineComponent({
  name: "GemAlarmStatistic",
  props: {
    codes: { type: Object as PropType<GemPageProps["codes"]>, required: true },
    functionCodes: { type: [Object, Array] as PropType<GemPageProps["functionCodes"]>, required: true },
    onNavigatePage: { type: Function as PropType<GemPageProps["onNavigatePage"]>, required: true },
    getAlarmClient: { type: Function as PropType<GemPageProps["getAlarmClient"]>, required: true },
    getOuaaClient: { type: Function as PropType<GemPageProps["getOuaaClient"]> },
    applicationCode: { type: String, default: "" },
    title: { type: String, default: "报警统计" },
    mode: { type: String as PropType<StatisticMode>, default: "trend" },
  },
  setup(props) {
    const appCode = () => props.applicationCode.trim() || "DOORMANAGE";
    const loading = ref(false);
    const exporting = ref(false);
    const previousMonth = (): [Dayjs, Dayjs] => [
      dayjs().subtract(1, "month").startOf("month"),
      dayjs().subtract(1, "month").endOf("month"),
    ];
    const dates = ref<[Dayjs, Dayjs] | undefined>(props.mode === "user" ? previousMonth() : undefined);
    const state = reactive({
      pageNumber: 1,
      pageSize: 10,
      total: 0,
      keyword: "",
      departmentId: "",
      alarmEventTypeCode: "",
      departmentOptions: [] as SelectOption[],
      eventOptions: [] as SelectOption[],
      rows: [] as StatisticsRecord[],
      analysis: [] as StatisticsRecord[],
      analysisRecord: {} as StatisticsRecord,
    });
    const isTable = computed(() => props.mode === "status" || props.mode === "user");

    const request = (): Record<string, unknown> => ({
      applicationCode: appCode(),
      pageNumber: state.pageNumber,
      pageSize: state.pageSize,
      keyword: state.keyword,
      departmentId: state.departmentId || undefined,
      alarmEventTypeCode: state.alarmEventTypeCode || undefined,
      period: rangePeriod(dates.value),
    });

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const getAlarmClient = props.getAlarmClient;
        if (!getAlarmClient) throw new Error("alarm client is unavailable");
        const client = await getAlarmClient();
        if (props.mode === "status" || props.mode === "user") {
          const raw =
            props.mode === "status" ? await client.getAlarmStatisticByEvent(request()) : await client.getAlarmStatisticByUser(request());
          const page = statisticsPage(raw);
          state.rows = page.records.map((row, index) => ({
            ...row,
            __rowKey: String(row.id ?? row.alarmEvent ?? row.userId ?? `${state.pageNumber}-${index}`),
          }));
          state.total = page.total;
          return;
        }

        const query = { applicationCode: appCode(), period: rangePeriod(dates.value) };
        const raw =
          props.mode === "event"
            ? await client.getAlarmEventAnalysis(query)
            : props.mode === "area"
              ? await client.getAlarmAreaAnalysis(query)
              : props.mode === "handler"
                ? await client.getAlarmHandlerAnalysis(query)
                : props.mode === "device"
                  ? await client.getAlarmDeviceTopTen(query)
                  : await client.getAlarmTrendAnalysis(query);
        state.analysis = statisticsRows(raw, ["alarmTrendStatisticsVOS", "records", "list", "data"]);
        state.analysisRecord = statisticsRecord(raw);
      } catch (error) {
        state.rows = [];
        state.analysis = [];
        state.total = 0;
        message.error(error instanceof Error ? error.message : "报警统计加载失败");
      } finally {
        loading.value = false;
      }
    };

    const drill = (record: StatisticsRecord, alarmStatus = "", timeout = ""): void => {
      props.onNavigatePage({
        page: GEM_PAGE_KEYS.alarmRecord,
        params: {
          period: rangePeriod(dates.value),
          alarmEvent: rowLabel(record, "alarmEvent"),
          alarmEventName: rowLabel(record, "alarmEventName"),
          userId: rowLabel(record, "userId"),
          userName: rowLabel(record, "userName"),
          departmentId: rowLabel(record, "departmentId"),
          alarmEventTypeId: state.alarmEventTypeCode,
          alarmStatus,
          alarmHandlerTimeoutStatus: timeout,
        },
      });
    };

    const linkColumn = (title: string, field: string, status = "", timeout = "") => ({
      title,
      dataIndex: field,
      width: 130,
      customRender: ({ record }: { record: StatisticsRecord }) => (
        <Button type="link" onClick={() => drill(record, status, timeout)}>
          {valueText(record[field])}
        </Button>
      ),
    });

    const eventColumns = [
      {
        title: "报警事件",
        dataIndex: "alarmEventName",
        minWidth: 180,
        customRender: ({ record }: { record: StatisticsRecord }) => rowLabel(record, "alarmEventName"),
      },
      {
        title: "报警总数",
        dataIndex: "totalNum",
        width: 110,
        customRender: ({ record }: { record: StatisticsRecord }) => valueText(record.totalNum),
      },
      linkColumn("待接收报警数", "unConfirmedNum", "ALARM_UN_CONFIRMED"),
      linkColumn("处理中报警数", "progressConfirmedNum", "ALARM_PROGRESS_CONFIRMED"),
      linkColumn("已处理报警数", "handlerNum", "ALARM_HANDLER"),
      linkColumn("已挂起报警数", "suspendNum", "ALARM_SUSPEND"),
      linkColumn("超时报警数", "timeoutNum", "", "TIMED_OUT"),
    ];
    const userColumns = [
      {
        title: "人员姓名",
        dataIndex: "userName",
        width: 120,
        customRender: ({ record }: { record: StatisticsRecord }) => rowLabel(record, "userName"),
      },
      {
        title: "所属部门",
        dataIndex: "departmentName",
        width: 150,
        customRender: ({ record }: { record: StatisticsRecord }) => rowLabel(record, "departmentName"),
      },
      {
        title: "部门报警数",
        dataIndex: "departmentTotalNum",
        width: 130,
        customRender: ({ record }: { record: StatisticsRecord }) => valueText(record.departmentTotalNum),
      },
      {
        title: "个人报警数",
        dataIndex: "totalNum",
        width: 130,
        customRender: ({ record }: { record: StatisticsRecord }) => valueText(record.totalNum),
      },
      linkColumn("未响应报警数", "unconfirmedNum", "ALARM_UN_CONFIRMED"),
      linkColumn("处理中报警数", "progressConfirmedNum", "ALARM_PROGRESS_CONFIRMED"),
      linkColumn("已处理报警数", "handlerNum", "ALARM_HANDLER"),
      linkColumn("已挂起报警数", "suspendNum", "ALARM_SUSPEND"),
      linkColumn("超时报警数", "timeoutNum", "", "TIMED_OUT"),
      { title: "报警占比", dataIndex: "ratio", width: 110 },
      { title: "报警处理率", dataIndex: "handlerRate", width: 120 },
      { title: "报警响应率", dataIndex: "confirmedRate", width: 120 },
      { title: "报警超时率", dataIndex: "timeoutRate", width: 120 },
      { title: "处理平均耗时", dataIndex: "averageProcessing", width: 140 },
    ];

    const exportData = async (): Promise<void> => {
      exporting.value = true;
      try {
        const getAlarmClient = props.getAlarmClient;
        if (!getAlarmClient) throw new Error("alarm client is unavailable");
        const client = await getAlarmClient();
        const raw =
          props.mode === "user" ? await client.exportAlarmStatisticByUser(request()) : await client.exportAlarmStatisticByEvent(request());
        download(raw, props.mode === "user" ? "报警处理统计.xlsx" : "报警统计.xlsx");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "导出失败");
      } finally {
        exporting.value = false;
      }
    };

    const chartOption = computed(() => {
      const labels = state.analysis.map((row) => rowLabel(row, "period", "name", "alarmEventName", "userName", "deviceName"));
      const values = state.analysis.map((row) => rowNumber(row, "alarmNum", "totalNum", "value"));
      const isTrend = props.mode === "trend";
      return {
        tooltip: { trigger: "axis" },
        grid: { left: 42, right: 22, top: 28, bottom: 48 },
        xAxis: { type: "category", boundaryGap: !isTrend, data: labels },
        yAxis: { type: "value", minInterval: 1 },
        series: [
          {
            type: isTrend ? "line" : "bar",
            smooth: isTrend,
            symbol: "circle",
            barWidth: 20,
            color: isTrend ? "#40a3ff" : "#3662ec",
            areaStyle: isTrend ? { opacity: 0.14 } : undefined,
            data: values,
          },
        ],
      };
    });

    const analysisTotal = computed(() => state.analysis.reduce((total, row) => total + rowNumber(row, "alarmNum", "totalNum", "value"), 0));
    const analysisTop = computed(() => {
      if (state.analysis.length === 0) return "--";
      const row = state.analysis.toSorted(
        (left, right) => rowNumber(right, "alarmNum", "totalNum", "value") - rowNumber(left, "alarmNum", "totalNum", "value"),
      )[0];
      return rowLabel(row, "period", "name", "alarmEventName", "userName", "deviceName");
    });

    const updateDates = (value: unknown): void => {
      const first = Array.isArray(value) ? value[0] : undefined;
      const second = Array.isArray(value) ? value[1] : undefined;
      dates.value = first && second ? [dayjs(first), dayjs(second)] : undefined;
    };

    const query = (): void => {
      state.pageNumber = 1;
      void load();
    };

    const reset = (): void => {
      dates.value = props.mode === "user" ? previousMonth() : undefined;
      state.keyword = "";
      state.departmentId = "";
      state.alarmEventTypeCode = "";
      state.pageNumber = 1;
      void load();
    };

    const loadFilterOptions = async (): Promise<void> => {
      if (props.mode !== "user") return;
      const [departments, events] = await Promise.allSettled([
        props.getOuaaClient?.().then((client) => client.getDepartments({ enabled: true })),
        props.getAlarmClient?.().then((client) => client.getEmergencyEventTypes({})),
      ]);
      state.departmentOptions =
        departments.status === "fulfilled" && Array.isArray(departments.value) ? departmentOptions(departments.value) : [];
      state.eventOptions = events.status === "fulfilled" ? selectOptions(events.value) : [];
    };

    onMounted(() => {
      void loadFilterOptions();
      void load();
    });

    return () => (
      <PageLayout
        title={props.title}
        showFooter={isTable.value}
        v-slots={{
          "layout-header": () =>
            isTable.value ? (
              <Button type="primary" loading={exporting.value} onClick={() => void exportData()}>
                导出
              </Button>
            ) : null,
          "layout-content": () => (
            <Spin spinning={loading.value}>
              {isTable.value ? (
                <>
                  <div class={styles.tableFilterBar}>
                    {props.mode === "user" ? (
                      <>
                        <span>所属部门：</span>
                        <Select
                          value={state.departmentId || undefined}
                          options={state.departmentOptions}
                          placeholder="请选择所属部门"
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          style={{ width: "180px" }}
                          onUpdate:value={(value: string | undefined) => {
                            state.departmentId = value ?? "";
                          }}
                        />
                        <span>报警事件：</span>
                        <Select
                          value={state.alarmEventTypeCode || undefined}
                          options={state.eventOptions}
                          placeholder="请选择报警事件"
                          allowClear
                          style={{ width: "180px" }}
                          onUpdate:value={(value: string | undefined) => {
                            state.alarmEventTypeCode = value ?? "";
                          }}
                        />
                      </>
                    ) : null}
                    <span>报警时间：</span>
                    <AntRangePicker value={dates.value} onUpdate:value={updateDates} />
                    <Input
                      value={state.keyword}
                      allowClear
                      placeholder={props.mode === "status" ? "请输入事件名称" : "请输入人员名称"}
                      style={{ width: "220px" }}
                      onUpdate:value={(value: string) => {
                        state.keyword = value;
                      }}
                      onPressEnter={query}
                    />
                    <Button type="primary" onClick={query}>
                      查询
                    </Button>
                    <Button onClick={reset}>重置</Button>
                  </div>
                  <Table
                    rowKey="__rowKey"
                    columns={props.mode === "status" ? eventColumns : userColumns}
                    dataSource={state.rows}
                    locale={{ emptyText: "暂无数据" }}
                    pagination={false}
                    scroll={{ x: props.mode === "user" ? 1800 : 1000 }}
                  />
                </>
              ) : (
                <div class={styles.analysisPage}>
                  <div class={styles.filterBar}>
                    <div class={styles.filterLabel}>报警时间</div>
                    <AntRangePicker value={dates.value} onUpdate:value={updateDates} />
                    <Button type="primary" onClick={query}>
                      查询
                    </Button>
                    <Button onClick={reset}>重置</Button>
                  </div>
                  <div class={styles.summaryGrid}>
                    <div class={styles.summaryCard}>
                      <span>报警总量</span>
                      <strong>{analysisTotal.value.toLocaleString("zh-CN")}</strong>
                    </div>
                    <div class={styles.summaryCard}>
                      <span>统计项</span>
                      <strong>{state.analysis.length}</strong>
                    </div>
                    <div class={styles.summaryCard}>
                      <span>峰值项</span>
                      <strong class={styles.topValue}>{analysisTop.value}</strong>
                    </div>
                  </div>
                  <Card bordered={false} class={styles.chartCard}>
                    <div class={styles.chartHeader}>
                      <div>
                        <h3>{props.title}</h3>
                        <p>按当前筛选条件展示报警数据分布</p>
                      </div>
                      {state.analysisRecord.alarmTopEventName || state.analysisRecord.alarmTopAreaName ? (
                        <span class={styles.focusTag}>重点：{rowLabel(state.analysisRecord, "alarmTopEventName", "alarmTopAreaName")}</span>
                      ) : null}
                    </div>
                    {state.analysis.length > 0 ? (
                      <GemChartPanel option={chartOption.value} height={380} />
                    ) : (
                      <div class={styles.emptyState}>
                        <Empty description="当前条件下暂无报警统计数据" />
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </Spin>
          ),
          "footer-page": () =>
            isTable.value ? (
              <Page
                current={state.pageNumber}
                pageSize={state.pageSize}
                total={state.total}
                showSizeChanger
                showTotal={(total: number) => `共 ${total} 条数据`}
                onPageChange={(page: number, size: number) => {
                  state.pageNumber = page;
                  state.pageSize = size;
                  void load();
                }}
              />
            ) : null,
        }}
      />
    );
  },
});

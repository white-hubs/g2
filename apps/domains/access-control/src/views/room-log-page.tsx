import type { AccessControlClient } from "@g2-contract/access-control";
import type { PcChartHandle } from "@g2-platform/pc-chart";
import { defineComponent, inject, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";

import { DOMAIN_CONTEXT_KEY } from "../domain-context";
import { getAccessControlPcChart, getAccessControlPcUi } from "../domain-context";
import { formatDateTime, formatRangeBound } from "./datetime";
import { normalizeDevicePage } from "./device-actions";
import { resolveEventPhoto } from "./event-photo";
import { defineAsyncAccessPcUiComponent } from "./pc-ui-runtime";

import styles from "./room-log-page.module.css";

const roomPng = "/resource/v1/accesscontrol-migrate/room.png";
const PopOver = defineAsyncAccessPcUiComponent("PopOver");
const textCell = (value: unknown) => <PopOver content={String(value || "")}>{String(value || "--")}</PopOver>;

export default defineComponent({
  name: "RoomLogPage",
  setup: () => {
    const ctx = inject(DOMAIN_CONTEXT_KEY);
    if (!ctx) {
      throw new Error("RoomLogPage requires DomainContext");
    }
    const { Image, usePcForm, usePcTable, ZhConfigProvider } = getAccessControlPcUi();
    const Page = defineAsyncAccessPcUiComponent("Page");
    const PageLayout = defineAsyncAccessPcUiComponent("PageLayout");

    const chartRef = ref<HTMLDivElement>();
    let chart: PcChartHandle | undefined;
    const state = reactive({
      todayCount: 0,
      pageNumber: 1,
      pageSize: 10,
      total: 0,
      keyword: "",
      eventResult: "",
      startTime: "",
      endTime: "",
    });

    const client = async (): Promise<AccessControlClient> => ctx.ensureClient<AccessControlClient>("accessControlClient");

    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      tableCode: "ROOM_LOG",
      columns: [
        {
          title: "时间",
          dataIndex: "eventTime",
          width: 180,
          ellipsis: true,
          customRender: ({ text, record }: { text: unknown; record: Record<string, unknown> }) => {
            const raw = text ?? record?.eventTime;
            return textCell(raw ? formatDateTime(raw) : "");
          },
        },
        { title: "门禁名称", dataIndex: "doorName", ellipsis: true, customRender: ({ text }: { text: unknown }) => textCell(text) },
        { title: "通行人员", dataIndex: "personName", ellipsis: true, customRender: ({ text }: { text: unknown }) => textCell(text) },
        { title: "通行方式", dataIndex: "eventWay", ellipsis: true, customRender: ({ text }: { text: unknown }) => textCell(text) },
        { title: "通行事件", dataIndex: "eventName", ellipsis: true, customRender: ({ text }: { text: unknown }) => textCell(text) },
        {
          title: "通行照片",
          dataIndex: "pictureFile",
          width: 100,
          customRender: ({ record }: { record: Record<string, unknown> }) => {
            const src = resolveEventPhoto(record || {});
            if (!src) {
              return <span class={styles.photoEmpty}>无</span>;
            }
            return (
              <div class={styles.photoCell}>
                <Image width={56} height={40} src={src} style={{ objectFit: "cover" }} />
              </div>
            );
          },
        },
        {
          title: "通行结果",
          dataIndex: "eventResult",
          customRender: ({ text }: { text: unknown }) => {
            const pass = text === "DO_PASS";
            const label = pass ? "通过" : "拒绝";
            return <span class={pass ? styles.resultPass : styles.resultRefuse}>{label}</span>;
          },
        },
      ],
      fetchApi: async () => {
        const api = await client();
        const result = await api.getDoorEventRecord({
          pageNumber: state.pageNumber,
          pageSize: state.pageSize,
          keyword: state.keyword,
          eventResult: state.eventResult,
          startTime: state.startTime,
          endTime: state.endTime,
        });
        return normalizeDevicePage(result);
      },
      fetchLoaded: (data) => {
        state.total = data.total;
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "门禁名称",
          defaultValue: "",
          componentProps: { placeholder: "请输入门禁名称搜索", allowClear: true },
        },
        {
          component: "Select",
          fieldName: "eventResult",
          label: "通行结果",
          defaultValue: "",
          componentProps: {
            allowClear: true,
            placeholder: "请选择通行结果",
            options: [
              { value: "DO_PASS", label: "通过" },
              { value: "DO_REFUSE", label: "拒绝" },
            ],
          },
        },
        {
          component: "DateRangePicker",
          fieldName: "date",
          label: "时间范围",
          componentProps: { showTime: true },
        },
      ],
      handleSubmit: (values) => {
        const date = (values.date || []) as unknown[];
        state.keyword = String(values.keyword || "");
        state.eventResult = String(values.eventResult || "");
        state.startTime = formatRangeBound(date[0]);
        state.endTime = formatRangeBound(date[1]);
        state.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        Object.assign(state, { keyword: "", eventResult: "", startTime: "", endTime: "", pageNumber: 1 });
        tableApi.query();
      },
    });

    const loadSummary = async (): Promise<void> => {
      const api = await client();
      const [count, trendRaw] = await Promise.all([api.passedTodayNum({}), api.getToDayEventTrend({})]);
      state.todayCount = Number(count || 0);
      const trend = (trendRaw as Array<{ timeValue?: string; num?: number }>) || [];
      await nextTick();
      if (!chartRef.value) {
        return;
      }
      chart?.dispose();
      chart = getAccessControlPcChart().createPcChart(chartRef.value);
      chart.setOption({
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "none" },
          formatter(params: unknown) {
            const row = (params as Array<{ marker: string; name: string; value: number }>)[0];
            return `人数<br/>${row.marker}${row.name} 时: ${row.value.toLocaleString()}人`;
          },
        },
        grid: { left: "1%", right: "1%", bottom: "3%", containLabel: true },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: trend.map((item) => String(item.timeValue || "")),
          axisLabel: {
            interval: 0,
            rotate: 40,
            formatter: (value: string) => `${value}时`,
          },
          axisTick: { show: false },
        },
        yAxis: {
          type: "value",
          minInterval: 1,
          axisLabel: { formatter: (value: number) => `${value}人` },
        },
        series: [
          {
            name: "人数",
            type: "line",
            smooth: true,
            lineStyle: { color: "#fa8c16" },
            color: "#fa8c16",
            data: trend.map((item) => Number(item.num || 0)),
          },
        ],
      });
    };
    const resizeChart = (): void => chart?.resize();

    onMounted(() => {
      void loadSummary();
      window.addEventListener("resize", resizeChart);
    });
    onBeforeUnmount(() => {
      window.removeEventListener("resize", resizeChart);
      chart?.dispose();
    });

    return () => (
      <ZhConfigProvider>
        <div class={styles.page}>
          <div class={styles.main}>
            <span class={styles.title}>通行记录</span>
            <div class={styles.separator} />
            <div class={styles.top}>
              <div class={styles.topLeft}>
                <div class={styles.topLeftBox}>
                  <div class={styles.icon}>
                    <Image width={40} height={40} src={roomPng} preview={false} />
                  </div>
                  <div>今日通行</div>
                  <div class={styles.count}>
                    {state.todayCount}
                    <span>次</span>
                  </div>
                </div>
              </div>
              <div class={styles.verticalSeparator} />
              <div class={styles.topRight}>
                <div class={styles.chartTitle}>人员通行统计</div>
                <div ref={chartRef} class={styles.chart} />
              </div>
            </div>
            <div class={styles.separator} />
            <div class={styles.bottom}>
              <span class={styles.tableTitle}>通行记录</span>
              <PcForm />
              <div class={styles.table}>
                <PcTable />
              </div>
              <div class={styles.pagination}>
                <Page
                  current={state.pageNumber}
                  pageSize={state.pageSize}
                  total={state.total}
                  showQuickJumper={false}
                  showSizeChanger
                  showTotal={(total: number) => `共 ${total} 条`}
                  pageSizeOptions={["10", "20", "50", "100"]}
                  onPageChange={(pageNumber: number, pageSize: number) => {
                    state.pageNumber = pageNumber;
                    state.pageSize = pageSize;
                    tableApi.query();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </ZhConfigProvider>
    );
  },
});

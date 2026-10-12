import type { AccessControlClient } from "@g2-contract/access-control";
import type { PcChartHandle } from "@g2-platform/pc-chart";
import { defineComponent, inject, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";

import { APPLICATION_CODE_KEY, DOMAIN_CONTEXT_KEY, getAccessControlPcChart } from "../domain-context";
import { loadOverview, loadTrend } from "./overview-loader";
import { defineAsyncAccessPcUiComponent } from "./pc-ui-runtime";

import styles from "./room-home.module.css";

const roomPng = "/resource/v1/accesscontrol-migrate/room.png";
const text = (value: unknown): string => String(value || "--");

function formatDateTime(value: unknown): string {
  if (!value) return "--";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "--";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export default defineComponent({
  name: "RoomHome",
  setup: () => {
    const ctx = inject(DOMAIN_CONTEXT_KEY);
    if (!ctx) {
      throw new Error("RoomHome requires DomainContext (install must provide DOMAIN_CONTEXT_KEY)");
    }
    const Card = defineAsyncAccessPcUiComponent("Card");
    const Image = defineAsyncAccessPcUiComponent("Image");
    const PageLayout = defineAsyncAccessPcUiComponent("PageLayout");
    const RadioGroup = defineAsyncAccessPcUiComponent("RadioGroup");
    const Table = defineAsyncAccessPcUiComponent("Table");
    inject(APPLICATION_CODE_KEY); // reserved for multi-app; overview APIs currently unscoped

    const chartRef = ref<HTMLDivElement>();
    let chart: PcChartHandle | undefined;
    const state = reactive({
      timeFlag: "timeDay",
      todayCount: 0,
      ranking: [] as unknown[],
      events: [] as unknown[],
    });

    const rankingColumns = [
      {
        title: "排名",
        dataIndex: "rank",
        width: 80,
        customRender: ({ index }: { index: number }) => (
          <span class={[styles.rankIndex, styles[`rankIndex${index + 1}` as keyof typeof styles]].filter(Boolean)}>{index + 1}</span>
        ),
      },
      { title: "门禁名称", dataIndex: "doorName", ellipsis: true, customRender: ({ text: value }: { text: unknown }) => text(value) },
      { title: "使用次数", dataIndex: "num", width: 120, customRender: ({ text: value }: { text: unknown }) => text(value) },
    ];
    const eventColumns = [
      {
        title: "时间",
        dataIndex: "eventTime",
        width: 180,
        customRender: ({ text: value }: { text: unknown }) => formatDateTime(value),
      },
      { title: "门禁名称", dataIndex: "doorName", ellipsis: true, customRender: ({ text: value }: { text: unknown }) => text(value) },
      { title: "事件名称", dataIndex: "eventName", ellipsis: true, customRender: ({ text: value }: { text: unknown }) => text(value) },
    ];

    const renderChart = async (timeFlag: string): Promise<void> => {
      const client = await ctx.ensureClient<AccessControlClient>("accessControlClient");
      const trend = await loadTrend(client, timeFlag);
      await nextTick();
      if (!chartRef.value) {
        return;
      }
      chart?.dispose();
      chart = getAccessControlPcChart().createPcChart(chartRef.value);
      chart.setOption({
        tooltip: { trigger: "axis" },
        grid: { left: 40, right: 24, top: 24, bottom: 32 },
        xAxis: { type: "category", data: trend.map((item) => String(item.timeValue || "")) },
        yAxis: { type: "value", minInterval: 1 },
        series: [{ name: "人数", type: "line", smooth: true, color: "#fa8c16", data: trend.map((item) => Number(item.num || 0)) }],
      });
    };

    const load = async (): Promise<void> => {
      const client = await ctx.ensureClient<AccessControlClient>("accessControlClient");
      const data = await loadOverview(client);
      state.todayCount = data.todayCount;
      state.ranking = data.ranking;
      state.events = data.events;
    };

    const resizeChart = (): void => chart?.resize();

    onMounted(() => {
      void Promise.all([load(), renderChart(state.timeFlag)]);
      window.addEventListener("resize", resizeChart);
    });
    onBeforeUnmount(() => {
      window.removeEventListener("resize", resizeChart);
      chart?.dispose();
    });

    const slots = {
      "layout-content": () => (
        <div class={styles.accessOverview}>
          <section class={styles.accessOverviewSummary}>
            <Card class="access-overview-count" bordered={false}>
              <div class={styles.countBody}>
                <Image width={48} height={48} src={roomPng} preview={false} />
                <span>今日通行记录</span>
                <strong>
                  {state.todayCount}
                  <small>次</small>
                </strong>
              </div>
            </Card>
            <Card class="access-overview-chart-card" title="通行人数统计" bordered={false}>
              {{
                extra: () => (
                  <RadioGroup
                    buttonStyle="solid"
                    value={state.timeFlag}
                    options={[
                      { value: "timeDay", label: "日" },
                      { value: "timeMonth", label: "月" },
                      { value: "timeYear", label: "年" },
                    ]}
                    onUpdate:value={(value: string | number) => {
                      state.timeFlag = String(value);
                      void renderChart(String(value));
                    }}
                  />
                ),
                default: () => <div ref={chartRef} class={styles.chart} />,
              }}
            </Card>
          </section>
          <section class={styles.tables}>
            <Card title="门禁使用排名 Top10" bordered={false}>
              <Table rowKey="id" columns={rankingColumns} dataSource={state.ranking} pagination={false} scroll={{ y: 360 }} />
            </Card>
            <Card title="门禁记录" bordered={false}>
              <Table rowKey="id" columns={eventColumns} dataSource={state.events} pagination={false} scroll={{ y: 360 }} />
            </Card>
          </section>
        </div>
      ),
    };

    return () => <PageLayout title="门禁概览" v-slots={slots} showFooter={false} />;
  },
});

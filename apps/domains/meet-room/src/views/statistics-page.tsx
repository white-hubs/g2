import type { PcChartOption } from "@g2-platform/pc-chart";
import { Button, Card, PageLayout, message, usePcForm } from "@g2-platform/pc-ui";
import { computed, defineComponent, onMounted, reactive, ref } from "vue";

import { StatChart } from "../components/stat-chart";
import { getMeetRoomClient } from "../domain-context";
import { errorMessage } from "../shared";

import styles from "../styles.module.css";

const palette = ["#1677ff", "#36cfc9", "#73d13d", "#ffc53d", "#9254de", "#ff7a45"];
export const ReservationStatisticsPage = defineComponent({
  name: "ReservationStatisticsPage",
  setup() {
    const query = reactive<{ TimeFlag: string; period?: string[] }>({ TimeFlag: "TODAY", period: undefined });
    const usage = ref<{ name?: string | null; num?: string | number | null }[]>([]);
    const total = ref(0);
    const idle = ref<{ conferenceName?: string | null; idleRate?: number | null }[]>([]);
    const intervals = ref<
      {
        conferenceName?: string | null;
        conferenceNameLists?: { intervalLogCount?: number | null; timeInterval?: string | null }[] | null;
      }[]
    >([]);
    const loading = ref(false);
    const params = () => ({ TimeFlag: query.TimeFlag, period: query.period?.length === 2 ? query.period.join(",") : undefined });
    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const [usageRows, count, idleRows, intervalRows] = await Promise.all([
          getMeetRoomClient().getConferenceUsage(params()),
          getMeetRoomClient().getConferenceCount(params()),
          getMeetRoomClient().getConferenceIdle(params()),
          getMeetRoomClient().getTimeIntervalLog(params()),
        ]);
        usage.value = usageRows;
        total.value = Number(count.num ?? 0);
        idle.value = idleRows;
        intervals.value = intervalRows;
      } catch (error) {
        message.error(errorMessage(error, "预约分析加载失败"));
      } finally {
        loading.value = false;
      }
    };
    const usageOption = computed<PcChartOption>(() => ({
      color: palette,
      tooltip: { trigger: "axis" },
      grid: { left: 44, right: 22, top: 30, bottom: 42 },
      xAxis: {
        type: "category",
        data: usage.value.map((item) => item.name ?? "未命名"),
        axisLabel: { interval: 0, rotate: usage.value.length > 8 ? 25 : 0 },
      },
      yAxis: { type: "value", min: 0 },
      series: [{ name: "使用次数", type: "bar", barMaxWidth: 34, data: usage.value.map((item) => Number(item.num ?? 0)) }],
    }));
    const idleOption = computed<PcChartOption>(() => ({
      color: ["#36cfc9"],
      tooltip: { trigger: "axis" },
      grid: { left: 48, right: 24, top: 30, bottom: 42 },
      xAxis: { type: "category", data: idle.value.map((item) => item.conferenceName ?? "未命名") },
      yAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%" } },
      series: [{ name: "空闲率", type: "bar", barMaxWidth: 34, data: idle.value.map((item) => Number(item.idleRate ?? 0)) }],
    }));
    const intervalNames = computed(() => [
      ...new Set(
        intervals.value.flatMap((series) => series.conferenceNameLists?.map((item) => item.timeInterval ?? "") ?? []).filter(Boolean),
      ),
    ]);
    const intervalOption = computed<PcChartOption>(() => ({
      color: palette,
      tooltip: { trigger: "axis" },
      legend: { top: 0, type: "scroll" },
      grid: { left: 48, right: 24, top: 46, bottom: 44 },
      xAxis: { type: "category", data: intervalNames.value },
      yAxis: { type: "value", min: 0 },
      series: intervals.value.map((series) => ({
        name: series.conferenceName ?? "未命名",
        type: "line",
        smooth: true,
        symbolSize: 7,
        data: intervalNames.value.map((name) =>
          Number(series.conferenceNameLists?.find((item) => item.timeInterval === name)?.intervalLogCount ?? 0),
        ),
      })),
    }));
    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "Select",
          fieldName: "TimeFlag",
          label: "统计周期",
          defaultValue: "TODAY",
          componentProps: {
            options: [
              { label: "今日", value: "TODAY" },
              { label: "本周", value: "WEEK" },
              { label: "本月", value: "MONTH" },
              { label: "本年", value: "YEAR" },
              { label: "自定义", value: "CUSTOM" },
            ],
          },
        },
        {
          component: "RangePicker",
          fieldName: "period",
          label: "日期范围",
          defaultValue: undefined,
          componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true },
        },
      ],
      handleSubmit(values) {
        query.TimeFlag = String(values.TimeFlag ?? "TODAY");
        query.period = Array.isArray(values.period) ? values.period.map(String) : undefined;
        void load();
      },
      handleReset() {
        query.TimeFlag = "TODAY";
        query.period = undefined;
        void load();
      },
    });
    onMounted(() => void load());
    return () => (
      <PageLayout
        title="预约分析"
        showFooter={false}
        v-slots={{
          "layout-header": () => (
            <Button type="primary" loading={loading.value} onClick={() => void load()}>
              刷新数据
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.pageContent}>
              <PcForm />
              <div class={styles.statisticsContent}>
                <Card class={styles.chartCard} title="会议室使用情况">
                  <div class={styles.metricRow}>
                    预约总次数 <strong class={styles.metricValue}>{total.value}</strong> 次
                  </div>
                  <StatChart option={usageOption.value} />
                </Card>
                <Card class={styles.chartCard} title="会议室空闲率">
                  <StatChart option={idleOption.value} />
                </Card>
                <Card class={[styles.chartCard, styles.wideCard]} title="会议时段分析">
                  <StatChart option={intervalOption.value} />
                </Card>
              </div>
            </div>
          ),
        }}
      />
    );
  },
});

import type { PcChartHandle, PcChartOption } from "@g2-platform/pc-chart";
import { type PropType, defineComponent, onMounted, onUnmounted, reactive, ref, watch } from "vue";

import { getClient, loadChart, loadUi } from "./context";
import { errorText, number, object, rows, text } from "./model";

import styles from "./styles.module.css";
const { Button, PageLayout, RangePicker, Space, message, dayjs } = await loadUi();
const { createPcChart } = await loadChart();
const Chart = defineComponent({
  props: { option: { type: Object as PropType<PcChartOption>, required: true }, title: { type: String, required: true } },
  setup(props) {
    const host = ref<HTMLDivElement>();
    let chart: PcChartHandle | undefined;
    let observer: ResizeObserver | undefined;
    onMounted(() => {
      if (host.value) {
        chart = createPcChart(host.value);
        chart.setOption(props.option);
        observer = new ResizeObserver(() => chart?.resize());
        observer.observe(host.value);
      }
    });
    watch(
      () => props.option,
      (option) => chart?.setOption(option),
      { deep: true },
    );
    onUnmounted(() => {
      observer?.disconnect();
      chart?.dispose();
    });
    return () => <div class={styles.chart} ref={host} role="img" aria-label={props.title} />;
  },
});
export const Overview = defineComponent({
  setup() {
    const state = reactive({
      period: [dayjs().startOf("day").format("YYYY-MM-DD HH:mm:ss"), dayjs().endOf("day").format("YYYY-MM-DD HH:mm:ss")] as [
        string,
        string,
      ],
      quick: "day",
      loading: false,
      data: {} as Record<string, unknown>,
      theme: "training",
      attendance: "training",
    });
    let version = 0;
    async function load() {
      const current = ++version;
      state.loading = true;
      try {
        const result = await getClient().overview(
          state.period.join(","),
          `${dayjs().startOf("year").format("YYYY-MM-DD HH:mm:ss")},${dayjs().format("YYYY-MM-DD HH:mm:ss")}`,
        );
        if (current === version) {
          state.data = result;
          if (result.errors) {
            message.warning("部分统计接口读取失败，已显示可用数据");
          }
        }
      } catch (error) {
        message.error(errorText(error));
      } finally {
        if (current === version) {
          state.loading = false;
        }
      }
    }
    const pie = (key: string, name: string): PcChartOption => ({
      color: ["#1677ff", "#36cfc9", "#73d13d", "#ffc53d", "#9254de"],
      tooltip: { trigger: "item" },
      legend: { type: "scroll", bottom: 0 },
      series: [
        {
          name,
          type: "pie",
          radius: ["38%", "65%"],
          label: { formatter: "{b}: {d}%" },
          data: rows(state.data[key]).map((item) => ({ name: text(item.name), value: number(item.totalNum ?? item.num) })),
        },
      ],
    });
    const attendance = (): PcChartOption => {
      const data = rows(state.data[`${state.attendance}Attendance`]);
      const names = state.attendance === "exam" ? ["预计参加人数", "不及格人数", "缺考人数"] : ["参加培训人数", "缺勤人数", "迟到人数"];
      const keys =
        state.attendance === "exam"
          ? ["examUserNumber", "noPassedUserNumber", "missExamUserNumber"]
          : ["trainNum", "unsignedNum", "belatedNum"];
      return {
        tooltip: { trigger: "axis" },
        legend: { data: names },
        grid: { left: 50, right: 24, top: 50, bottom: 48 },
        xAxis: { type: "category", data: data.map((item) => text(item.name)) },
        yAxis: { type: "value", minInterval: 1 },
        series: keys.map((key, i) => ({ name: names[i], type: "bar", barMaxWidth: 30, data: data.map((item) => number(item[key])) })),
      };
    };
    const trend = (): PcChartOption => {
      const training = rows(state.data.trainingTrend);
      const exam = rows(state.data.examTrend);
      const names = [...new Set([...training, ...exam].map((item) => text(item.name)))];
      return {
        tooltip: { trigger: "axis" },
        legend: { data: ["培训专题数", "考试专题数"] },
        grid: { left: 50, right: 24, top: 50, bottom: 48 },
        xAxis: { type: "category", data: names, boundaryGap: false },
        yAxis: { type: "value", minInterval: 1 },
        series: [training, exam].map((items, i) => ({
          name: i ? "考试专题数" : "培训专题数",
          type: "line",
          smooth: true,
          data: names.map((name) => number(items.find((item) => text(item.name) === name)?.num)),
        })),
      };
    };
    onMounted(() => void load());
    onUnmounted(() => {
      version++;
    });
    return () => (
      <PageLayout
        title="数据总览"
        showFooter={false}
        v-slots={{
          "layout-header": () => (
            <Space wrap>
              {[
                { unit: "day", label: "今日" },
                { unit: "week", label: "本周" },
                { unit: "month", label: "本月" },
                { unit: "year", label: "今年" },
              ].map((item) => (
                <Button
                  type={state.quick === item.unit ? "primary" : "default"}
                  onClick={() => {
                    state.quick = item.unit;
                    const unit = item.unit as "day" | "week" | "month" | "year";
                    // 旧版“今年”是年初至今天，趋势接口同样只查询已经发生的月份。
                    state.period = [
                      dayjs().startOf(unit).format("YYYY-MM-DD HH:mm:ss"),
                      dayjs()
                        .endOf(unit === "year" ? "day" : unit)
                        .format("YYYY-MM-DD HH:mm:ss"),
                    ];
                    void load();
                  }}
                >
                  {item.label}
                </Button>
              ))}
              <RangePicker
                value={state.period}
                valueFormat="YYYY-MM-DD HH:mm:ss"
                showTime
                allowClear={false}
                onUpdate:value={(value: unknown) => {
                  if (Array.isArray(value) && value.length === 2) {
                    state.period = [String(value[0]), String(value[1])];
                    state.quick = "custom";
                    void load();
                  }
                }}
              />
              <Button loading={state.loading} onClick={() => void load()}>
                刷新
              </Button>
            </Space>
          ),
          "layout-content": () => (
            <div class={styles.scroll}>
              <div class={styles.stats}>
                {[
                  { label: "培训任务数", value: object(state.data.training).cultivateNum },
                  { label: "考试任务数", value: object(state.data.exam).totalNum },
                  { label: "培训缺勤人次", value: object(state.data.trainingUsers).unsignedNum },
                  { label: "考试不及格人次", value: object(state.data.exam).noPassedUserNumber },
                  { label: "缺考人次", value: object(state.data.exam).missExamUserNumber },
                ].map((item) => (
                  <div class={styles.stat}>
                    {item.label}
                    <strong>{number(item.value)}</strong>
                  </div>
                ))}
              </div>
              <div class={styles.charts}>
                <section class={styles.panel}>
                  <h3>考试类型占比</h3>
                  <Chart title="考试类型占比" option={pie("examTypes", "考试类型")} />
                </section>
                <section class={styles.panel}>
                  <h3>培训类型占比</h3>
                  <Chart title="培训类型占比" option={pie("trainingTypes", "培训类型")} />
                </section>
                <section class={styles.panel}>
                  <div class={styles.sectionHeader}>
                    <h3>培训 / 考试主题占比</h3>
                    <Space>
                      <Button
                        size="small"
                        type={state.theme === "training" ? "primary" : "default"}
                        onClick={() => {
                          state.theme = "training";
                        }}
                      >
                        培训
                      </Button>
                      <Button
                        size="small"
                        type={state.theme === "exam" ? "primary" : "default"}
                        onClick={() => {
                          state.theme = "exam";
                        }}
                      >
                        考试
                      </Button>
                    </Space>
                  </div>
                  <Chart title="主题占比" option={pie(`${state.theme}Themes`, "主题")} />
                </section>
                <section class={styles.panel}>
                  <div class={styles.sectionHeader}>
                    <h3>出勤情况统计</h3>
                    <Space>
                      <Button
                        size="small"
                        type={state.attendance === "training" ? "primary" : "default"}
                        onClick={() => {
                          state.attendance = "training";
                        }}
                      >
                        培训
                      </Button>
                      <Button
                        size="small"
                        type={state.attendance === "exam" ? "primary" : "default"}
                        onClick={() => {
                          state.attendance = "exam";
                        }}
                      >
                        考试
                      </Button>
                    </Space>
                  </div>
                  <Chart title="出勤情况统计" option={attendance()} />
                </section>
                <section class={[styles.panel, styles.wide]}>
                  <h3>培训 / 考试专题数趋势</h3>
                  <Chart title="培训考试专题数趋势" option={trend()} />
                </section>
              </div>
            </div>
          ),
        }}
      />
    );
  },
});

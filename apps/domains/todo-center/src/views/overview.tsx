import type { PcChartHandle, PcChartOption } from "@g2-platform/pc-chart";
import { defineComponent, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import { getTodoCenterChart, getTodoCenterClient } from "../domain-context";
import { Empty, PageLayout, message } from "../pc-ui-runtime";

import styles from "../todo-center.module.less";
export const TodoOverview = defineComponent({
  name: "TodoOverview",
  setup() {
    const count = ref(0);
    const tags = ref<{ businessType: string; businessTypeName: string; total: number | string }[]>([]);
    const host = ref<HTMLDivElement>();
    let chart: PcChartHandle | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    async function refresh(): Promise<void> {
      try {
        const api = getTodoCenterClient();
        const [total, categories, trend] = await Promise.all([api.getTodoTaskCount(), api.getTodoTaskTags(), api.getTodoTaskTagsTrend()]);
        count.value = total;
        tags.value = categories;
        if (host.value) {
          chart ??= getTodoCenterChart().createPcChart(host.value);
          const option: PcChartOption = {
            tooltip: { trigger: "axis" },
            grid: { left: 24, right: 24, bottom: 22, top: 18, containLabel: true },
            xAxis: { type: "category", boundaryGap: false, data: trend.map((item) => item.period) },
            yAxis: { type: "value", minInterval: 1 },
            series: [{ name: "任务数量", type: "line", smooth: true, data: trend.map((item) => item.total) }],
          };
          chart.setOption(option);
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : "待办统计加载失败");
      }
    }
    const resize = (): void => chart?.resize();
    onMounted(() => {
      void refresh();
      timer = setInterval(() => void refresh(), 30_000);
      window.addEventListener("resize", resize);
    });
    onBeforeUnmount(() => {
      if (timer) {clearInterval(timer);}
      window.removeEventListener("resize", resize);
      chart?.dispose();
    });
    return () => (
      <PageLayout
        title="待办统计"
        showFooter={false}
        v-slots={{
          "layout-content": () => (
            <div class={styles.pageBody}>
              <nav class={styles.tabs}>
                <RouterLink to="/d/todo-center/waiting">待处理</RouterLink>
                <RouterLink to="/d/todo-center/done">已处理</RouterLink>
                <RouterLink to="/d/todo-center/overview">全部</RouterLink>
              </nav>
              <div class={styles.overview}>
                <section class={styles.statCard}>
                  <h2>待办统计</h2>
                  <div>
                    <strong>{count.value}</strong>
                    <span>个待办任务</span>
                  </div>
                </section>
                <section class={styles.statCard}>
                  <h2>待办任务</h2>
                  <div class={styles.tags}>
                    {tags.value.length > 0 ? (
                      tags.value.map((tag) => (
                        <div key={tag.businessType}>
                          <strong>{tag.total}</strong>
                          <span>{tag.businessTypeName}</span>
                        </div>
                      ))
                    ) : (
                      <Empty description="暂无待办任务" />
                    )}
                  </div>
                </section>
                <section class={styles.trendCard}>
                  <h2>任务趋势（近 30 天）</h2>
                  <div ref={host} class={styles.chart} />
                </section>
              </div>
            </div>
          ),
        }}
      />
    );
  },
});

import type { FaultTrend } from "@g2-client/fault-repair/client";
import * as echarts from "echarts";
import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { PropType } from "vue";

/** 案例频次沿用旧页的分类轴折线图；尺寸跟随可见容器变化。 */
export const CaseTrendChart = defineComponent({
  name: "CaseTrendChart",
  props: { months: { type: Array as PropType<FaultTrend["months"]>, default: () => [] } },
  setup(props) {
    const element = ref<HTMLElement | null>(null);
    let chart: echarts.ECharts | undefined;
    let observer: ResizeObserver | undefined;
    const render = () =>
      chart?.setOption({
        tooltip: { trigger: "axis" },
        grid: { left: 8, right: 16, bottom: 8, top: 32, containLabel: true },
        xAxis: { type: "category", boundaryGap: true, data: props.months.map((item) => item.timeFlag) },
        yAxis: { type: "value" },
        series: [{ name: "频次", type: "line", stack: "Total", data: props.months.map((item) => item.num) }],
      });
    onMounted(() => {
      if (!element.value) {
        return;
      }
      chart = echarts.init(element.value);
      observer = new ResizeObserver(() => chart?.resize());
      observer.observe(element.value);
      render();
    });
    watch(() => props.months, render, { deep: true });
    onBeforeUnmount(() => {
      observer?.disconnect();
      chart?.dispose();
    });
    return () => h("div", { ref: element, style: { width: "100%", height: "260px" } });
  },
});

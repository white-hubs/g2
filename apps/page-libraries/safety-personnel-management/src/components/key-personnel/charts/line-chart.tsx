/** @jsxImportSource vue */
import { createPcChart } from "@g2-platform/pc-chart";
import type { PcChartHandle as ECharts } from "@g2-platform/pc-chart";
import { type PropType, defineComponent, onMounted, onUnmounted, ref, watch } from "vue";

import "./charts.css";

export const LineChart = defineComponent({
  props: {
    categories: { type: Array as PropType<string[]>, default: () => [] },
    series: { type: Array as PropType<number[]>, default: () => [] },
  },
  setup(props) {
    const chartRef = ref<HTMLDivElement>();
    let chart: ECharts | null = null;
    let observer: ResizeObserver | undefined;

    const render = (): void => {
      if (!chart) {
        return;
      }
      chart.setOption({
        tooltip: { trigger: "axis" },
        grid: { left: 50, right: 20, bottom: 40, top: 30 },
        xAxis: { type: "category", data: props.categories },
        yAxis: { type: "value", minInterval: 1 },
        series: [
          {
            type: "line",
            data: props.series,
            smooth: true,
            areaStyle: { opacity: 0.08 },
            itemStyle: { color: "#ef4444" },
          },
        ],
      });
    };

    onMounted(() => {
      if (chartRef.value) {
        chart = createPcChart(chartRef.value);
        render();
        observer = new ResizeObserver(() => chart?.resize());
        observer.observe(chartRef.value);
      }
    });
    watch([() => props.categories, () => props.series], render, { deep: true });
    onUnmounted(() => {
      observer?.disconnect();
      chart?.dispose();
    });

    return () => <div class="chart-box" ref={chartRef} />;
  },
});
